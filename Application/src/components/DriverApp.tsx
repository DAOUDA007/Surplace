"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell, Sheet } from "@/components/AppShell";
import { MapView, type MapMarker } from "@/components/MapView";
import { Button, ErrorMessage, Route } from "@/components/ui";
import { useServerEvents } from "@/hooks/useServerEvents";
import { useSheetHeight } from "@/hooks/useSheetHeight";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { CITY_CENTER } from "@/lib/places";
import { formatFcfa, haversineKm } from "@/lib/pricing";
import type { DriverProfile, DriverSubscription, LatLng, Ride, User } from "@/lib/types";
import { SubscriptionPanel } from "./SubscriptionPanel";

const LINKS = [
  { href: "/chauffeur/historique", label: "💰 Mes gains" },
  { href: "/chauffeur/profil", label: "👤 Mon profil" },
];

type AvailableRide = Ride & { pickupDistanceKm: number | null };

/** Déplacement simulé en mode démo (mètres par pas de 2 s). */
const DEMO_STEP_M = 90;

function moveToward(from: LatLng, to: LatLng, meters: number): LatLng {
  const dist = haversineKm(from, to) * 1000;
  if (dist <= meters) return to;
  const f = meters / dist;
  return { lat: from.lat + (to.lat - from.lat) * f, lng: from.lng + (to.lng - from.lng) * f };
}

export function DriverApp({ user, initialProfile }: { user: User; initialProfile: DriverProfile }) {
  const [profile, setProfile] = useState(initialProfile);
  const [ride, setRide] = useState<Ride | null>(null);
  const [available, setAvailable] = useState<AvailableRide[]>([]);
  const [position, setPosition] = useState<LatLng | null>(
    initialProfile.lat != null && initialProfile.lng != null
      ? { lat: initialProfile.lat, lng: initialProfile.lng }
      : null,
  );
  // En développement, le mode démo est actif par défaut (pas de GPS sur ordinateur).
  const [demo, setDemo] = useState(process.env.NODE_ENV !== "production");
  const [finished, setFinished] = useState<Ride | null>(null);
  const [today, setToday] = useState({ count: 0, total: 0 });
  const [subscription, setSubscription] = useState<DriverSubscription | null>(null);
  const [showSubscription, setShowSubscription] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const previous = useRef<Ride | null>(null);
  const lastSent = useRef(0);
  const sheet = useSheetHeight<HTMLDivElement>();

  const loadProfile = useCallback(async () => {
    const [{ driver }, sub] = await Promise.all([
      api<{ driver: DriverProfile }>("/api/me"),
      api<DriverSubscription>("/api/driver/subscription"),
    ]);
    setProfile(driver);
    setSubscription(sub);
  }, []);

  const loadAvailable = useCallback(async () => {
    const { rides } = await api<{ rides: AvailableRide[] }>("/api/driver/available");
    setAvailable(rides);
  }, []);

  const loadToday = useCallback(async () => {
    const { rides } = await api<{ rides: Ride[] }>("/api/rides");
    const day = new Date().toDateString();
    const done = rides.filter(
      (r) => r.status === "completed" && r.completedAt && new Date(r.completedAt).toDateString() === day,
    );
    setToday({ count: done.length, total: done.reduce((s, r) => s + r.price, 0) });
  }, []);

  const loadRide = useCallback(async () => {
    const { ride } = await api<{ ride: Ride | null }>("/api/rides/current");
    const prev = previous.current;
    if (prev && !ride) {
      // La course a disparu sans que le chauffeur la termine : annulée par le passager.
      const latest = await api<{ rides: Ride[] }>("/api/rides").then((d) => d.rides.find((r) => r.id === prev.id));
      if (latest?.status === "cancelled") setNotice("Le passager a annulé la course.");
    }
    previous.current = ride;
    setRide(ride);
  }, []);

  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([loadProfile(), loadRide(), loadAvailable(), loadToday()]);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [loadProfile, loadRide, loadAvailable, loadToday]);

  useEffect(() => {
    refreshAll();
    const timer = setInterval(() => {
      loadRide().catch(() => null);
      loadAvailable().catch(() => null);
    }, 15_000);
    return () => clearInterval(timer);
  }, [refreshAll, loadRide, loadAvailable]);

  useServerEvents((event) => {
    if (event.type === "available-rides") loadAvailable().catch(() => null);
    if (event.type === "ride") loadRide().catch(() => null);
    if (event.type === "profile") loadProfile().catch(() => null);
  }, refreshAll);

  // --- Position GPS réelle ---
  useEffect(() => {
    if (!profile.isOnline || demo) return;
    if (!window.isSecureContext || !("geolocation" in navigator)) {
      setDemo(true);
      setNotice(
        window.isSecureContext
          ? "Votre navigateur ne permet pas la localisation : mode démo activé."
          : "GPS bloqué : le site doit être ouvert en https. Mode démo activé (touchez la carte pour placer votre moto).",
      );
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {
        setDemo(true);
        setNotice("GPS indisponible : mode démo activé. Touchez la carte pour placer votre moto.");
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [profile.isOnline, demo]);

  // --- Mode démo : la moto avance seule vers le point de départ puis la destination ---
  const demoTarget =
    ride?.status === "accepted" ? ride.pickup : ride?.status === "in_progress" ? ride.dropoff : null;
  useEffect(() => {
    if (!demo || !demoTarget) return;
    const t = setInterval(() => {
      setPosition((p) => (p ? moveToward(p, demoTarget, DEMO_STEP_M) : p));
    }, 2000);
    return () => clearInterval(t);
  }, [demo, demoTarget?.lat, demoTarget?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Envoi de la position au serveur ---
  useEffect(() => {
    if (!profile.isOnline || !position) return;
    if (Date.now() - lastSent.current < 1500) return;
    lastSent.current = Date.now();
    api("/api/driver/location", position).catch(() => null);
  }, [position, profile.isOnline]);

  async function run(key: string, fn: () => Promise<void>) {
    setError("");
    setNotice("");
    setBusy(key);
    try {
      await fn();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const toggleOnline = () =>
    run("online", async () => {
      const online = !profile.isOnline;
      if (online && !position) setPosition(CITY_CENTER);
      const { driver } = await api<{ driver: DriverProfile }>("/api/driver/status", { online });
      setProfile(driver);
      if (online) {
        lastSent.current = 0;
        if (position) api("/api/driver/location", position).catch(() => null);
      }
      await loadAvailable();
    });

  const accept = (id: number) =>
    run(`accept-${id}`, async () => {
      const { ride } = await api<{ ride: Ride }>(`/api/rides/${id}/action`, { action: "accept" });
      previous.current = ride;
      setRide(ride);
      setFinished(null);
    });

  const step = (action: "arrive" | "start" | "complete" | "cancel") =>
    run(action, async () => {
      if (!ride) return;
      const { ride: updated } = await api<{ ride: Ride }>(`/api/rides/${ride.id}/action`, { action });
      if (action === "complete") {
        setFinished(updated);
        loadToday();
      }
      const active = action === "complete" || action === "cancel" ? null : updated;
      previous.current = active;
      setRide(active);
      if (!active) loadAvailable();
    });

  // --- Carte ---
  const markers: MapMarker[] = [];
  if (position) markers.push({ id: "me", kind: "driver", position, label: "Vous" });
  if (ride) {
    markers.push({ id: "pickup", kind: "pickup", position: ride.pickup, label: ride.pickup.label });
    markers.push({ id: "dropoff", kind: "dropoff", position: ride.dropoff, label: ride.dropoff.label });
  } else if (profile.isOnline) {
    for (const r of available) {
      markers.push({ id: `req-${r.id}`, kind: "request", position: r.pickup, label: formatFcfa(r.price) });
    }
  }
  const navTarget = ride ? (ride.status === "in_progress" ? ride.dropoff : ride.pickup) : null;
  const fitTo: LatLng[] = navTarget
    ? [position, navTarget].filter((p): p is LatLng => !!p)
    : position
      ? [position]
      : [];

  const map = (
    <MapView
      markers={markers}
      route={ride && position && navTarget ? [position, navTarget] : null}
      fitTo={fitTo}
      onMapClick={demo ? setPosition : undefined}
      bottomPadding={sheet.height}
    />
  );

  const onlinePill = (
    <span
      className={`flex h-11 items-center gap-2 rounded-full px-4 text-sm font-bold shadow-md ${
        profile.isOnline ? "bg-green-600 text-white" : "bg-surface text-muted"
      }`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${profile.isOnline ? "animate-pulse bg-surface" : "bg-faint"}`} />
      {profile.isOnline ? "En ligne" : "Hors ligne"}
    </span>
  );

  return (
    <AppShell name={user.name} links={LINKS} map={map} topCenter={<span className="hidden sm:block">{onlinePill}</span>}>
      <Sheet ref={sheet.ref}>
        {notice && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
        {error && (
          <div className="mb-3">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}

        {profile.status !== "approved" ? (
          <AccountPending status={profile.status} />
        ) : finished ? (
          <div className="space-y-4 text-center">
            <p className="text-4xl">✅</p>
            <p className="text-xl font-extrabold">Course terminée</p>
            <div className="rounded-2xl bg-brand-soft p-4">
              <p className="text-sm text-muted">Encaissez en espèces</p>
              <p className="text-3xl font-extrabold">{formatFcfa(finished.price)}</p>
              <p className="mt-1 text-xs text-muted">Aucune commission : ce montant est entièrement pour vous.</p>
            </div>
            <Button onClick={() => setFinished(null)} className="w-full">
              Continuer
            </Button>
          </div>
        ) : ride ? (
          <CurrentRide ride={ride} busy={busy} onStep={step} />
        ) : !profile.subscriptionActive || showSubscription ? (
          subscription ? (
            <SubscriptionPanel
              subscription={subscription}
              onChange={setSubscription}
              onClose={profile.subscriptionActive ? () => setShowSubscription(false) : undefined}
            />
          ) : (
            <div className="h-40 animate-pulse rounded-2xl bg-subtle" />
          )
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-muted">Aujourd&apos;hui</p>
                <p className="text-xl font-extrabold">{formatFcfa(today.total)}</p>
                <p className="text-xs text-muted">
                  {today.count} course{today.count > 1 ? "s" : ""}
                </p>
              </div>
              <Button
                variant={profile.isOnline ? "ghost" : "primary"}
                onClick={toggleOnline}
                loading={busy === "online"}
              >
                {profile.isOnline ? "Passer hors ligne" : "Passer en ligne"}
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setShowSubscription(true)}
              className="flex w-full items-center justify-between rounded-2xl bg-subtle px-4 py-3 text-left text-sm"
            >
              <span>
                <span className="font-semibold">Abonnement actif</span>
                {subscription && (
                  <span className="block text-xs text-muted">
                    {subscription.daysLeft} jour{subscription.daysLeft > 1 ? "s" : ""} restant
                    {subscription.daysLeft > 1 ? "s" : ""}
                    {subscription.pending ? " · demande de renouvellement en attente" : ""}
                  </span>
                )}
              </span>
              <span className="font-semibold text-brand">Gérer</span>
            </button>

            <label className="flex items-center justify-between gap-3 rounded-2xl bg-subtle px-4 py-3 text-sm">
              <span>
                <span className="font-semibold">Mode démo</span>
                <span className="block text-xs text-muted">
                  Position simulée : touchez la carte, la moto roule seule pendant la course.
                </span>
              </span>
              <input
                type="checkbox"
                checked={demo}
                onChange={(e) => setDemo(e.target.checked)}
                className="h-5 w-5 accent-[var(--color-brand)]"
              />
            </label>

            {!profile.isOnline ? (
              <p className="py-4 text-center text-sm text-muted">
                Passez en ligne pour recevoir les demandes de courses autour de vous.
              </p>
            ) : available.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-3xl">📡</p>
                <p className="mt-2 font-semibold">En attente de courses…</p>
                <p className="text-sm text-muted">Les nouvelles demandes apparaîtront ici.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-bold">
                  {available.length} demande{available.length > 1 ? "s" : ""} à proximité
                </p>
                {available.map((r) => (
                  <div key={r.id} className="space-y-3 rounded-2xl border border-line p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <Route from={r.pickup.label} to={r.dropoff.label} />
                      </div>
                      <p className="shrink-0 text-lg font-extrabold">{formatFcfa(r.price)}</p>
                    </div>
                    <p className="text-xs text-muted">
                      {r.pickupDistanceKm != null && <>À {r.pickupDistanceKm.toLocaleString("fr-FR")} km · </>}
                      Trajet {r.distanceKm.toLocaleString("fr-FR")} km · {r.passenger.name.split(" ")[0]}
                    </p>
                    <Button onClick={() => accept(r.id)} loading={busy === `accept-${r.id}`} className="w-full">
                      Accepter
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}

function AccountPending({ status }: { status: DriverProfile["status"] }) {
  return status === "pending" ? (
    <div className="space-y-2 py-4 text-center">
      <p className="text-4xl">⏳</p>
      <p className="text-xl font-extrabold">Compte en cours de validation</p>
      <p className="text-sm text-muted">
        L&apos;équipe SURPLACE vérifie vos informations. Vous pourrez passer en ligne dès la validation de votre
        compte. Cette page se mettra à jour automatiquement.
      </p>
    </div>
  ) : (
    <div className="space-y-2 py-4 text-center">
      <p className="text-4xl">⛔</p>
      <p className="text-xl font-extrabold">Compte suspendu</p>
      <p className="text-sm text-muted">Contactez le support SURPLACE pour plus d&apos;informations.</p>
    </div>
  );
}

function CurrentRide({
  ride,
  busy,
  onStep,
}: {
  ride: Ride;
  busy: string | null;
  onStep: (action: "arrive" | "start" | "complete" | "cancel") => void;
}) {
  const target = ride.status === "in_progress" ? ride.dropoff : ride.pickup;
  const nav = `https://www.google.com/maps/dir/?api=1&destination=${target.lat},${target.lng}&travelmode=driving`;
  const next = {
    accepted: { action: "arrive", label: "Je suis arrivé", title: "Rejoignez le passager" },
    arrived: { action: "start", label: "Démarrer la course", title: "Le passager monte" },
    in_progress: { action: "complete", label: "Terminer la course", title: "En route vers la destination" },
  }[ride.status as "accepted" | "arrived" | "in_progress"];

  if (!next) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-extrabold">{next.title}</p>
        <a
          href={nav}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700"
        >
          🧭 GPS
        </a>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-subtle p-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-contrast font-bold text-on-contrast">
          {ride.passenger.name.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{ride.passenger.name}</p>
          <p className="text-sm text-muted">{formatPhone(ride.passenger.phone)}</p>
        </div>
        <a
          href={`tel:${ride.passenger.phone}`}
          className="grid h-11 w-11 place-items-center rounded-full bg-green-600 text-lg text-white"
          title="Appeler le passager"
        >
          📞
        </a>
      </div>

      <Route from={ride.pickup.label} to={ride.dropoff.label} />

      <div className="flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
        <span className="text-sm font-medium">💵 Espèces · {ride.distanceKm.toLocaleString("fr-FR")} km</span>
        <span className="text-lg font-extrabold">{formatFcfa(ride.price)}</span>
      </div>

      <Button
        variant={ride.status === "in_progress" ? "dark" : "primary"}
        onClick={() => onStep(next.action as "arrive" | "start" | "complete")}
        loading={busy === next.action}
        className="w-full text-lg"
      >
        {next.label}
      </Button>
      {ride.status !== "in_progress" && (
        <Button variant="danger" onClick={() => onStep("cancel")} loading={busy === "cancel"} className="w-full">
          Annuler la course
        </Button>
      )}
    </div>
  );
}
