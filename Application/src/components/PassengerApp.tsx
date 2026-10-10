"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppShell, Sheet } from "@/components/AppShell";
import { DriverPhoto } from "@/components/DriverPhoto";
import { EmergencyButton } from "@/components/EmergencyButton";
import { MapView, type MapMarker } from "@/components/MapView";
import { OtpField } from "@/components/OtpField";
import { PlaceSearch } from "@/components/PlaceSearch";
import { ShareRideButton } from "@/components/ShareRideButton";
import { Button, ErrorMessage, Route, Stars } from "@/components/ui";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { useServerEvents } from "@/hooks/useServerEvents";
import { useSheetHeight } from "@/hooks/useSheetHeight";
import { api } from "@/lib/api";
import { formatPhone, minutesFromKm, toLocalInput } from "@/lib/format";
import { locateUser } from "@/lib/geolocation";
import { CITY_CENTER, CITY_NAME, reverseGeocode } from "@/lib/places";
import { announce, type AnnouncementKey } from "@/lib/preferences";
import { estimateTrip, formatFcfa, haversineKm, PRICING } from "@/lib/pricing";
import { enablePush, pushSupported } from "@/lib/push";
import type { LatLng, Place, Ride, RideStatus, SavedPlace, TripEstimate, User } from "@/lib/types";

const LINKS = [
  { href: "/passager/historique", label: "🧾 Mes courses" },
  { href: "/passager/profil", label: "👤 Mon profil" },
  { href: "/notifications", label: "🔔 Notifications" },
];

/** Menu d'un passager invité : il n'a pas de profil, mais peut créer son compte. */
const GUEST_LINKS = [
  { href: "/passager/historique", label: "🧾 Mes courses" },
  { href: "/inscription", label: "👤 Créer mon compte" },
  { href: "/notifications", label: "🔔 Notifications" },
];

const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none transition focus:border-ink";

const KIND_ICONS: Record<SavedPlace["kind"], string> = { home: "🏠", work: "💼", other: "⭐" };

/** Annonce vocale à chaque changement d'étape de la course. */
const STATUS_ANNOUNCE: Partial<Record<RideStatus, AnnouncementKey>> = {
  accepted: "driver-found",
  arrived: "driver-arrived",
  in_progress: "ride-started",
};

const isFutureScheduled = (ride: Ride) =>
  ride.status === "requested" && !!ride.scheduledAt && new Date(ride.scheduledAt).getTime() > Date.now() + 15 * 60_000;

/** `user` est null pour un visiteur non connecté : il peut tout de même commander (mode invité). */
export function PassengerApp({ user }: { user: User | null }) {
  const router = useRouter();
  const config = usePublicConfig();
  const signedIn = !!user;
  const [ride, setRide] = useState<Ride | null>(null);
  const [rideToRate, setRideToRate] = useState<Ride | null>(null);
  const [loaded, setLoaded] = useState(!signedIn);
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
  /** Visiteur sans compte : nom, numéro et code SMS demandés au moment de commander. */
  const [contact, setContact] = useState({ name: "", phone: "", code: "" });
  const [askContact, setAskContact] = useState(false);
  /** Options de commande : plus tard (réservation) et pour un proche. */
  const [when, setWhen] = useState<"now" | "later">("now");
  const [scheduledLocal, setScheduledLocal] = useState("");
  const [forOther, setForOther] = useState(false);
  const [rider, setRider] = useState({ name: "", phone: "" });
  const [estimate, setEstimate] = useState<TripEstimate | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [recent, setRecent] = useState<Place[]>([]);
  const [showPushInvite, setShowPushInvite] = useState(false);
  /** Le passager a choisi son départ lui-même : la localisation ne doit plus l'écraser. */
  const manualPickup = useRef(false);

  const previous = useRef<Ride | null>(null);
  const selfCancelled = useRef(false);
  const dismissed = useRef(new Set<number>());
  const sheet = useSheetHeight<HTMLDivElement>();

  const refresh = useCallback(async () => {
    if (!signedIn) return;
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
          announce("ride-cancelled");
        } else if (data.ride?.status === "requested" && prev.status !== "requested") {
          setNotice("Le chauffeur a annulé. Nous recherchons un autre chauffeur…");
        }
      }
      if (data.ride && prev?.id === data.ride.id && prev.status !== data.ride.status) {
        const key = STATUS_ANNOUNCE[data.ride.status];
        if (key) announce(key);
      }
      if (prev && !data.ride && data.rideToRate?.id === prev.id) announce("ride-completed");
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
  }, [signedIn]);

  useEffect(() => {
    refresh();
    // Filet de sécurité si le flux temps réel est coupé.
    const timer = setInterval(refresh, 15_000);
    return () => clearInterval(timer);
  }, [refresh]);

  useServerEvents(
    (event) => {
      if (event.type === "location" && event.rideId === previous.current?.id) {
        setDriverPos({ lat: event.lat, lng: event.lng });
      } else if (event.type === "ride") {
        refresh();
      }
    },
    refresh,
    signedIn,
  );

  // Lieux favoris et dernières destinations (comptes et invités connectés).
  const loadPlaces = useCallback(async () => {
    if (!signedIn) return;
    const data = await api<{ saved: SavedPlace[]; recent: Place[] }>("/api/me/places").catch(() => null);
    if (data) {
      setSaved(data.saved);
      setRecent(data.recent);
    }
  }, [signedIn]);
  useEffect(() => {
    loadPlaces();
  }, [loadPlaces]);

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

  const scheduledAt = when === "later" && scheduledLocal ? new Date(scheduledLocal).toISOString() : null;

  // Prix calculé par le serveur (itinéraire routier, majorations de nuit ou de pluie).
  useEffect(() => {
    if (!pickup || !dropoff || pickup.label.endsWith("…") || dropoff.label.endsWith("…")) {
      setEstimate(null);
      return;
    }
    let alive = true;
    setEstimating(true);
    const t = setTimeout(async () => {
      try {
        const { estimate } = await api<{ estimate: TripEstimate }>("/api/estimate", { pickup, dropoff, scheduledAt });
        if (alive) setEstimate(estimate);
      } catch {
        // Serveur injoignable : estimation locale avec les tarifs connus.
        const local = estimateTrip(pickup, dropoff, config?.settings.pricing ?? PRICING);
        if (alive) {
          setEstimate({ ...local, basePrice: local.price, surchargePercent: 0, surchargeLabels: [], geometry: null, source: "estimate" });
        }
      } finally {
        if (alive) setEstimating(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [pickup, dropoff, scheduledAt, config]);

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

  const guestForm = !signedIn && askContact;

  const order = () => {
    // Visiteur sans compte : on demande d'abord son nom, son numéro et le code SMS.
    if (!signedIn && !askContact) {
      setAskContact(true);
      return;
    }
    if (when === "later" && !scheduledLocal) {
      setError("Choisissez le jour et l'heure de la course.");
      return;
    }
    run(async () => {
      const body = {
        pickup,
        dropoff,
        scheduledAt,
        rider: forOther ? rider : null,
      };
      const { ride } = signedIn
        ? await api<{ ride: Ride }>("/api/rides", body)
        : await api<{ ride: Ride }>("/api/rides/guest", { ...body, ...contact });
      previous.current = ride;
      setRide(ride);
      setAskContact(false);
      if (pushSupported() && Notification.permission === "default") setShowPushInvite(true);
      // Le serveur vient de connecter l'invité sur cet appareil : la page se met à jour (menu, suivi en direct).
      if (!signedIn) router.refresh();
    });
  };

  const cancel = () =>
    run(async () => {
      if (!ride) return;
      selfCancelled.current = true;
      await api(`/api/rides/${ride.id}/action`, { action: "cancel" });
      await refresh();
    });

  async function savePlace(kind: SavedPlace["kind"]) {
    if (!dropoff) return;
    const data = await api<{ saved: SavedPlace[] }>("/api/me/places", { kind, label: dropoff.label, lat: dropoff.lat, lng: dropoff.lng }).catch(
      (err) => {
        setError((err as Error).message);
        return null;
      },
    );
    if (data) setSaved(data.saved);
  }

  const shortcuts = useMemo(
    () => [
      ...saved.map((s) => ({ place: s, icon: KIND_ICONS[s.kind] })),
      ...recent.filter((r) => !saved.some((s) => s.label === r.label)).map((r) => ({ place: r, icon: "🕘" })),
    ],
    [saved, recent],
  );
  const dropoffSaved = !!dropoff && saved.some((s) => s.label === dropoff.label);

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

  const route =
    !ride && estimate?.geometry ? estimate.geometry : shownPickup && shownDropoff ? [shownPickup, shownDropoff] : null;

  const map = (
    <MapView
      markers={markers}
      route={route}
      fitTo={fitTo}
      onMapClick={ride ? undefined : pickOnMap}
      bottomPadding={sheet.height}
      accuracy={ride ? null : accuracy}
    />
  );

  const minLater = toLocalInput(new Date(Date.now() + 25 * 60_000));
  const maxLater = toLocalInput(new Date(Date.now() + 7 * 86_400_000));

  return (
    <AppShell name={user?.name} links={user?.isGuest ? GUEST_LINKS : LINKS} map={map}>
      <Sheet ref={sheet.ref}>
        {notice && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
        {error && (
          <div className="mb-3">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}
        {showPushInvite && (
          <div className="mb-3 flex items-center gap-3 rounded-2xl bg-sky-50 p-3 text-sm text-sky-800">
            <span className="flex-1">🔔 Être prévenu quand le chauffeur arrive, même téléphone en veille ?</span>
            <button
              type="button"
              className="rounded-full bg-sky-700 px-3 py-1.5 text-xs font-semibold text-white"
              onClick={async () => {
                setShowPushInvite(false);
                await enablePush().catch(() => null);
              }}
            >
              Activer
            </button>
            <button type="button" className="text-xs" onClick={() => setShowPushInvite(false)}>
              Non
            </button>
          </div>
        )}

        {!loaded ? (
          <div className="h-40 animate-pulse rounded-2xl bg-subtle" />
        ) : ride ? (
          isFutureScheduled(ride) ? (
            <ScheduledRide ride={ride} busy={busy} onCancel={cancel} />
          ) : (
            <ActiveRide ride={ride} driverPos={driverPos} busy={busy} onCancel={cancel} />
          )
        ) : rideToRate ? (
          <RateRide
            ride={rideToRate}
            onDone={() => {
              dismissed.current.add(rideToRate.id);
              setRideToRate(null);
              setDropoff(null);
              loadPlaces();
            }}
          />
        ) : (
          <div className="space-y-3">
            <h1 className="text-xl font-extrabold">
              Où allez-vous{user ? `, ${user.name.split(" ")[0]}` : ""} ?
            </h1>
            {!user && <p className="-mt-2 text-sm text-muted">Pas besoin de compte : commandez directement.</p>}
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
              shortcuts={saved.map((s) => ({ place: s, icon: KIND_ICONS[s.kind] }))}
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
              shortcuts={shortcuts}
            />
            {!dropoff && shortcuts.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {shortcuts.slice(0, 6).map((s) => (
                  <button
                    key={`${s.icon}-${s.place.label}`}
                    type="button"
                    onClick={() => setDropoff({ label: s.place.label, lat: s.place.lat, lng: s.place.lng })}
                    className="max-w-48 shrink-0 truncate rounded-full bg-subtle px-3 py-1.5 text-xs font-semibold"
                  >
                    {s.icon} {s.place.label}
                  </button>
                ))}
              </div>
            )}
            {signedIn && dropoff && !dropoffSaved && !dropoff.label.endsWith("…") && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted">Enregistrer cette destination :</span>
                {(["home", "work", "other"] as const).map((k) => (
                  <button key={k} type="button" onClick={() => savePlace(k)} className="rounded-full bg-subtle px-2.5 py-1 font-semibold">
                    {KIND_ICONS[k]} {k === "home" ? "Maison" : k === "work" ? "Travail" : "Favori"}
                  </button>
                ))}
              </div>
            )}
            {locationHint && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">{locationHint}</p>}
            <p className="text-xs text-muted">
              Astuce : touchez la carte pour placer le {target === "pickup" ? "départ" : "point d'arrivée"}, ou faites
              glisser un point pour l&apos;ajuster.
            </p>

            {pickup && dropoff && (estimate || estimating) && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-4 rounded-2xl border-2 border-ink p-4">
                  <span className="text-3xl">🏍️</span>
                  <div className="flex-1">
                    <p className="font-bold">Moto SURPLACE</p>
                    {estimate ? (
                      <p className="text-sm text-muted">
                        {estimate.distanceKm.toLocaleString("fr-FR")} km · ~{estimate.durationMin} min
                        {estimate.source === "osrm" ? " · par la route" : ""}
                      </p>
                    ) : (
                      <p className="text-sm text-muted">Calcul du prix…</p>
                    )}
                    {estimate && estimate.surchargeLabels.length > 0 && (
                      <p className="text-xs font-semibold text-amber-800">{estimate.surchargeLabels.join(" · ")}</p>
                    )}
                  </div>
                  <p className="text-lg font-extrabold">{estimate ? formatFcfa(estimate.price) : "…"}</p>
                </div>

                {/* Options : quand, pour qui */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="grid grid-cols-2 gap-1 rounded-2xl bg-subtle p-1 text-xs font-semibold">
                    {(["now", "later"] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWhen(w)}
                        className={`h-9 rounded-xl ${when === w ? "bg-surface shadow-sm" : "text-muted"}`}
                      >
                        {w === "now" ? "Maintenant" : "🕒 Plus tard"}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 rounded-2xl bg-subtle p-1 text-xs font-semibold">
                    {[false, true].map((o) => (
                      <button
                        key={String(o)}
                        type="button"
                        onClick={() => setForOther(o)}
                        className={`h-9 rounded-xl ${forOther === o ? "bg-surface shadow-sm" : "text-muted"}`}
                      >
                        {o ? "👤 Un proche" : "Pour moi"}
                      </button>
                    ))}
                  </div>
                </div>
                {when === "later" && (
                  <label className="block rounded-2xl bg-subtle p-3">
                    <span className="mb-1 block text-xs font-semibold">Jour et heure de prise en charge</span>
                    <input
                      type="datetime-local"
                      min={minLater}
                      max={maxLater}
                      value={scheduledLocal}
                      onChange={(e) => setScheduledLocal(e.target.value)}
                      className={inputClass}
                    />
                    <span className="mt-1 block text-xs text-muted">
                      Nous chercherons un chauffeur 15 minutes avant. Réservation jusqu&apos;à 7 jours à l&apos;avance.
                    </span>
                  </label>
                )}
                {forOther && (
                  <div className="space-y-2 rounded-2xl bg-subtle p-3">
                    <p className="text-xs font-semibold">Personne transportée (le chauffeur l&apos;appellera)</p>
                    <input
                      value={rider.name}
                      onChange={(e) => setRider((r) => ({ ...r, name: e.target.value }))}
                      placeholder="Son nom"
                      className={inputClass}
                    />
                    <input
                      type="tel"
                      inputMode="tel"
                      value={rider.phone}
                      onChange={(e) => setRider((r) => ({ ...r, phone: e.target.value }))}
                      placeholder="Son numéro"
                      className={inputClass}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between rounded-2xl bg-subtle px-4 py-3 text-sm">
                  <span className="font-medium">💵 Paiement</span>
                  <span className="font-semibold">Espèces</span>
                </div>
                {guestForm && (
                  <form
                    id="guest-contact"
                    onSubmit={(e) => {
                      e.preventDefault();
                      order();
                    }}
                    className="space-y-2 rounded-2xl bg-subtle p-4"
                  >
                    <p className="text-sm font-semibold">Pour que le chauffeur puisse vous joindre</p>
                    <input
                      required
                      autoComplete="name"
                      value={contact.name}
                      onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                      placeholder="Votre nom"
                      className={inputClass}
                    />
                    <input
                      required
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={contact.phone}
                      onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                      placeholder="Votre numéro (07 00 00 00 00)"
                      className={inputClass}
                    />
                    {config?.otpRequired && (
                      <OtpField phone={contact.phone} purpose="guest" value={contact.code} onChange={(code) => setContact((c) => ({ ...c, code }))} />
                    )}
                    <p className="text-xs text-muted">
                      Aucun compte nécessaire. Déjà inscrit ?{" "}
                      <Link href="/connexion" className="font-semibold text-brand">
                        Se connecter
                      </Link>
                    </p>
                  </form>
                )}
                <Button
                  type={guestForm ? "submit" : "button"}
                  form={guestForm ? "guest-contact" : undefined}
                  onClick={guestForm ? undefined : order}
                  loading={busy}
                  disabled={!estimate || (guestForm && !!config?.otpRequired && contact.code.length !== 6)}
                  className="w-full text-lg"
                >
                  {guestForm ? "Confirmer" : when === "later" ? "Réserver" : "Commander"}
                  {estimate ? ` · ${formatFcfa(estimate.price)}` : ""}
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
  const elapsed = useElapsed(ride.scheduledAt && new Date(ride.scheduledAt) > new Date(ride.requestedAt) ? ride.scheduledAt : ride.requestedAt);
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

function RiderLine({ ride }: { ride: Ride }) {
  if (!ride.riderName) return null;
  return (
    <p className="rounded-xl bg-subtle px-3 py-2 text-sm">
      👤 Pour <strong>{ride.riderName}</strong>
      {ride.riderPhone ? ` · ${formatPhone(ride.riderPhone)}` : ""}
    </p>
  );
}

/** Course réservée à l'avance, pas encore attribuée. */
function ScheduledRide({ ride, busy, onCancel }: { ride: Ride; busy: boolean; onCancel: () => void }) {
  const date = new Date(ride.scheduledAt!);
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-brand">🕒 Course réservée</p>
        <p className="text-xl font-extrabold">
          {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })} à{" "}
          {date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-sm text-muted">Nous chercherons un chauffeur 15 minutes avant. Vous serez prévenu.</p>
      </div>
      <RiderLine ride={ride} />
      <Route from={ride.pickup.label} to={ride.dropoff.label} />
      <div className="flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
        <span className="text-sm font-medium">💵 À payer en espèces</span>
        <span className="text-lg font-extrabold">{formatFcfa(ride.price)}</span>
      </div>
      <Button variant="danger" onClick={onCancel} loading={busy} className="w-full">
        Annuler la réservation
      </Button>
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
          {ride.status === "arrived" && <p className="text-sm text-muted">Rejoignez-le au point de départ.</p>}
        </div>
      )}

      {driver && (
        <div className="flex items-center gap-3 rounded-2xl bg-subtle p-3">
          <DriverPhoto src={driver.hasPhoto ? `/api/drivers/${driver.id}/photo` : null} name={driver.name} />
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

      {driver && (
        <div className="flex flex-wrap items-center gap-2">
          <ShareRideButton rideId={ride.id} />
          <EmergencyButton rideId={ride.id} />
        </div>
      )}

      <RiderLine ride={ride} />
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
