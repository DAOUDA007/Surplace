"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell, Sheet } from "@/components/AppShell";
import { MapView, type MapMarker } from "@/components/MapView";
import { PlaceSearch } from "@/components/PlaceSearch";
import { Button, ErrorMessage, Route, Stars } from "@/components/ui";
import { useServerEvents } from "@/hooks/useServerEvents";
import { useSheetHeight } from "@/hooks/useSheetHeight";
import { api } from "@/lib/api";
import { formatPhone, minutesFromKm } from "@/lib/format";
import { locateUser } from "@/lib/geolocation";
import { CITY_CENTER, CITY_NAME, reverseGeocode } from "@/lib/places";
import { estimateTrip, formatFcfa, haversineKm, PRICING } from "@/lib/pricing";
import type { LatLng, Place, Ride, User } from "@/lib/types";

const LINKS = [
  { href: "/passager/historique", label: "🧾 Mes courses" },
  { href: "/passager/profil", label: "👤 Mon profil" },
];

export function PassengerApp({ user }: { user: User }) {
  const [ride, setRide] = useState<Ride | null>(null);
  const [rideToRate, setRideToRate] = useState<Ride | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [pickup, setPickup] = useState<Place | null>(null);
  const [dropoff, setDropoff] = useState<Place | null>(null);
  const [target, setTarget] = useState<"pickup" | "dropoff">("pickup");
  const [driverPos, setDriverPos] = useState<LatLng | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [accuracy, setAccuracy] = useState<{ center: LatLng; radius: number } | null>(null);
  const [locationHint, setLocationHint] = useState("");
  /** Le passager a choisi son départ lui-même : la localisation ne doit plus l'écraser. */
  const manualPickup = useRef(false);

  const previous = useRef<Ride | null>(null);
  const selfCancelled = useRef(false);
  const dismissed = useRef(new Set<number>());
  const sheet = useSheetHeight<HTMLDivElement>();

  const refresh = useCallback(async () => {
    try {
      const data = await api<{ ride: Ride | null; rideToRate: Ride | null }>("/api/rides/current");
      const prev = previous.current;
      if (prev && prev.status !== "in_progress") {
        if (!data.ride && !data.rideToRate && !selfCancelled.current) {
          setNotice(
            prev.status === "requested"
              ? "Aucun chauffeur n'a accepté votre demande. Réessayez dans un instant."
              : "Votre course a été annulée.",
          );
        } else if (data.ride?.status === "requested" && prev.status !== "requested") {
          setNotice("Le chauffeur a annulé. Nous recherchons un autre chauffeur…");
        }
      }
      selfCancelled.current = false;
      previous.current = data.ride;
      setRide(data.ride);
      setRideToRate(data.rideToRate && !dismissed.current.has(data.rideToRate.id) ? data.rideToRate : null);
      const d = data.ride?.driver;
      setDriverPos(d?.lat != null && d.lng != null ? { lat: d.lat, lng: d.lng } : null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    refresh();
    // Filet de sécurité si le flux temps réel est coupé.
    const timer = setInterval(refresh, 15_000);
    return () => clearInterval(timer);
  }, [refresh]);

  useServerEvents((event) => {
    if (event.type === "location" && event.rideId === previous.current?.id) {
      setDriverPos({ lat: event.lat, lng: event.lng });
    } else if (event.type === "ride") {
      refresh();
    }
  }, refresh);

  const locate = useCallback(async () => {
    manualPickup.current = false;
    setLocating(true);
    setError("");
    setLocationHint("");
    try {
      // La position s'affine au fil des lectures (réseau d'abord, puis GPS).
      const best = await locateUser((r) => {
        if (manualPickup.current) return;
        setPickup({ ...r.point, label: "Ma position (localisation…)" });
        setAccuracy({ center: r.point, radius: r.accuracy });
      });
      if (manualPickup.current) return;
      setTarget("dropoff");
      const kmFromCity = haversineKm(best.point, CITY_CENTER);
      if (kmFromCity > 50) {
        setLocationHint(
          `Votre position détectée est à ${Math.round(kmFromCity)} km de ${CITY_NAME}. Si ce n'est pas l'endroit où vous êtes, choisissez votre départ sur la carte.`,
        );
      } else if (best.accuracy > 150) {
        setLocationHint(
          `Position approximative (± ${formatMeters(best.accuracy)}). Faites glisser le point vert « D » à l'endroit exact si besoin.`,
        );
      }
      const label = await reverseGeocode(best.point);
      if (!manualPickup.current) setPickup({ ...best.point, label });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLocating(false);
    }
  }, []);

  // Position actuelle comme point de départ par défaut.
  useEffect(() => {
    if (loaded && !ride) locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  function choosePickup(place: Place) {
    manualPickup.current = true;
    setAccuracy(null);
    setLocationHint("");
    setPickup(place);
  }

  async function placePoint(kind: "pickup" | "dropoff", point: LatLng) {
    const setter = kind === "pickup" ? choosePickup : setDropoff;
    setter({ ...point, label: "Recherche de l'adresse…" });
    setter({ ...point, label: await reverseGeocode(point) });
  }

  function pickOnMap(point: LatLng) {
    if (ride) return;
    if (target === "pickup" && !dropoff) setTarget("dropoff");
    placePoint(target, point);
  }

  const estimate = useMemo(() => (pickup && dropoff ? estimateTrip(pickup, dropoff) : null), [pickup, dropoff]);

  async function run(fn: () => Promise<void>) {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const order = () =>
    run(async () => {
      const { ride } = await api<{ ride: Ride }>("/api/rides", { pickup, dropoff });
      previous.current = ride;
      setRide(ride);
    });

  const cancel = () =>
    run(async () => {
      if (!ride) return;
      selfCancelled.current = true;
      await api(`/api/rides/${ride.id}/action`, { action: "cancel" });
      await refresh();
    });

  // --- Carte ---
  const shownPickup = ride?.pickup ?? pickup;
  const shownDropoff = ride?.dropoff ?? dropoff;
  const markers: MapMarker[] = [];
  // Avant la commande, les points se déplacent au doigt pour ajuster précisément.
  if (shownPickup) {
    markers.push({
      id: "pickup",
      kind: "pickup",
      position: shownPickup,
      label: ride ? "Départ" : "Départ (déplaçable)",
      onDragEnd: ride ? undefined : (p) => placePoint("pickup", p),
    });
  }
  if (shownDropoff) {
    markers.push({
      id: "dropoff",
      kind: "dropoff",
      position: shownDropoff,
      label: ride ? "Arrivée" : "Arrivée (déplaçable)",
      onDragEnd: ride ? undefined : (p) => placePoint("dropoff", p),
    });
  }
  if (ride && driverPos) markers.push({ id: "driver", kind: "driver", position: driverPos, label: ride.driver?.name });

  let fitTo: LatLng[] = [shownPickup, shownDropoff].filter((p): p is Place => !!p);
  if (ride && driverPos && (ride.status === "accepted" || ride.status === "arrived")) {
    fitTo = [driverPos, ride.pickup];
  } else if (ride && driverPos && ride.status === "in_progress") {
    fitTo = [driverPos, ride.dropoff];
  }

  const map = (
    <MapView
      markers={markers}
      route={shownPickup && shownDropoff ? [shownPickup, shownDropoff] : null}
      fitTo={fitTo}
      onMapClick={ride ? undefined : pickOnMap}
      bottomPadding={sheet.height}
      accuracy={ride ? null : accuracy}
    />
  );

  return (
    <AppShell name={user.name} links={LINKS} map={map}>
      <Sheet ref={sheet.ref}>
        {notice && (
          <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>
        )}
        {error && (
          <div className="mb-3">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}

        {!loaded ? (
          <div className="h-40 animate-pulse rounded-2xl bg-subtle" />
        ) : ride ? (
          <ActiveRide ride={ride} driverPos={driverPos} busy={busy} onCancel={cancel} />
        ) : rideToRate ? (
          <RateRide
            ride={rideToRate}
            onDone={() => {
              dismissed.current.add(rideToRate.id);
              setRideToRate(null);
              setDropoff(null);
            }}
          />
        ) : (
          <div className="space-y-3">
            <h1 className="text-xl font-extrabold">Où allez-vous, {user.name.split(" ")[0]} ?</h1>
            <PlaceSearch
              kind="pickup"
              value={pickup}
              onChange={(p) => {
                choosePickup(p);
                if (!dropoff) setTarget("dropoff");
              }}
              placeholder="Point de départ"
              active={target === "pickup"}
              onActivate={() => setTarget("pickup")}
              action={
                <button
                  type="button"
                  onClick={locate}
                  className="shrink-0 rounded-full px-2 py-1 text-xs font-semibold text-brand hover:bg-brand-soft"
                  title="Utiliser ma position"
                >
                  {locating ? "Localisation…" : "◎ Ma position"}
                </button>
              }
            />
            <PlaceSearch
              kind="dropoff"
              value={dropoff}
              onChange={setDropoff}
              placeholder="Destination"
              active={target === "dropoff"}
              onActivate={() => setTarget("dropoff")}
            />
            {locationHint && (
              <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{locationHint}</p>
            )}
            <p className="text-xs text-muted">
              Astuce : touchez la carte pour placer le {target === "pickup" ? "départ" : "point d'arrivée"}, ou faites
              glisser un point pour l&apos;ajuster.
            </p>

            {estimate && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-4 rounded-2xl border-2 border-ink p-4">
                  <span className="text-3xl">🏍️</span>
                  <div className="flex-1">
                    <p className="font-bold">Moto SURPLACE</p>
                    <p className="text-sm text-muted">
                      {estimate.distanceKm.toLocaleString("fr-FR")} km · ~{estimate.durationMin} min
                    </p>
                  </div>
                  <p className="text-lg font-extrabold">{formatFcfa(estimate.price)}</p>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-subtle px-4 py-3 text-sm">
                  <span className="font-medium">💵 Paiement</span>
                  <span className="font-semibold">Espèces</span>
                </div>
                <Button onClick={order} loading={busy} className="w-full text-lg">
                  Commander · {formatFcfa(estimate.price)}
                </Button>
              </div>
            )}
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}

function formatMeters(m: number) {
  return m >= 1000 ? `${(m / 1000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} km` : `${m} m`;
}

function useElapsed(since: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function Searching({ ride }: { ride: Ride }) {
  const elapsed = useElapsed(ride.requestedAt);
  return (
    <div className="flex items-center gap-4">
      <div className="relative grid h-14 w-14 place-items-center">
        <span className="absolute inset-0 animate-ping rounded-full bg-brand/30" />
        <span className="relative grid h-12 w-12 place-items-center rounded-full bg-brand text-2xl">🏍️</span>
      </div>
      <div>
        <p className="text-lg font-extrabold">Recherche d&apos;un chauffeur…</p>
        <p className="text-sm text-muted">Temps écoulé {elapsed}</p>
      </div>
    </div>
  );
}

function ActiveRide({
  ride,
  driverPos,
  busy,
  onCancel,
}: {
  ride: Ride;
  driverPos: LatLng | null;
  busy: boolean;
  onCancel: () => void;
}) {
  const driver = ride.driver;
  const target = ride.status === "in_progress" ? ride.dropoff : ride.pickup;
  const eta = driverPos ? minutesFromKm(haversineKm(driverPos, target) * PRICING.roadFactor) : null;

  const headline = {
    requested: null,
    accepted: `Votre chauffeur arrive${eta ? ` dans ~${eta} min` : ""}`,
    arrived: "Votre chauffeur est arrivé !",
    in_progress: `En route${eta ? ` · arrivée dans ~${eta} min` : ""}`,
    completed: "Course terminée",
    cancelled: "Course annulée",
  }[ride.status];

  return (
    <div className="space-y-4">
      {ride.status === "requested" ? (
        <Searching ride={ride} />
      ) : (
        <div>
          <p className="text-lg font-extrabold">{headline}</p>
          {ride.status === "arrived" && (
            <p className="text-sm text-muted">Rejoignez-le au point de départ.</p>
          )}
        </div>
      )}

      {driver && (
        <div className="flex items-center gap-3 rounded-2xl bg-subtle p-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-contrast text-lg font-bold text-on-contrast">
            {driver.name.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{driver.name}</p>
            <p className="text-sm text-muted">
              {driver.motoModel} · <span className="font-semibold text-ink">{driver.plate}</span>
            </p>
            <Stars value={driver.rating} />
          </div>
          <a
            href={`tel:${driver.phone}`}
            className="grid h-11 w-11 place-items-center rounded-full bg-green-600 text-lg text-white"
            title={`Appeler ${formatPhone(driver.phone)}`}
          >
            📞
          </a>
        </div>
      )}

      <Route from={ride.pickup.label} to={ride.dropoff.label} />

      <div className="flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
        <span className="text-sm font-medium">💵 À payer en espèces</span>
        <span className="text-lg font-extrabold">{formatFcfa(ride.price)}</span>
      </div>

      {ride.status !== "in_progress" && (
        <Button variant="danger" onClick={onCancel} loading={busy} className="w-full">
          Annuler la course
        </Button>
      )}
    </div>
  );
}

function RateRide({ ride, onDone }: { ride: Ride; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      await api(`/api/rides/${ride.id}/rate`, { rating, comment });
      onDone();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-4xl">🎉</p>
      <div>
        <p className="text-xl font-extrabold">Vous êtes arrivé !</p>
        <p className="text-sm text-muted">
          Réglez <span className="font-bold text-ink">{formatFcfa(ride.price)}</span> en espèces à{" "}
          {ride.driver?.name.split(" ")[0] ?? "votre chauffeur"}.
        </p>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold">Comment s&apos;est passée votre course ?</p>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              className={`text-4xl transition ${n <= rating ? "text-amber-400" : "text-line"}`}
              aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>
      </div>
      {rating > 0 && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Un commentaire ? (facultatif)"
          rows={2}
          className="w-full rounded-2xl border border-line p-3 text-sm outline-none focus:border-ink"
        />
      )}
      <ErrorMessage>{error}</ErrorMessage>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="ghost" onClick={onDone}>
          Plus tard
        </Button>
        <Button onClick={submit} disabled={rating === 0} loading={busy}>
          Envoyer
        </Button>
      </div>
    </div>
  );
}
