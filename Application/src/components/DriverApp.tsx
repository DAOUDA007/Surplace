"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppShell, Sheet } from "@/components/AppShell";
import { EmergencyButton } from "@/components/EmergencyButton";
import { MapView, type MapMarker } from "@/components/MapView";
import { ShareRideButton } from "@/components/ShareRideButton";
import { Button, ErrorMessage, Route, Stars } from "@/components/ui";
import { useServerEvents } from "@/hooks/useServerEvents";
import { useSheetHeight } from "@/hooks/useSheetHeight";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import { CITY_CENTER } from "@/lib/places";
import { announce, beep, isBatterySaver } from "@/lib/preferences";
import { formatFcfa, haversineKm } from "@/lib/pricing";
import { enablePush, pushSupported } from "@/lib/push";
import type { AvailableRide, DemandCell, DriverProfile, DriverSubscription, LatLng, Ride, User } from "@/lib/types";
import { SubscriptionPanel } from "./SubscriptionPanel";

const LINKS = [
  { href: "/chauffeur/historique", label: "💰 Mes gains et statistiques" },
  { href: "/chauffeur/profil", label: "👤 Profil et documents" },
  { href: "/notifications", label: "🔔 Notifications" },
];

/** Déplacement simulé en mode démo (mètres par pas de 2 s). */
const DEMO_STEP_M = 90;

function moveToward(from: LatLng, to: LatLng, meters: number): LatLng {
  const dist = haversineKm(from, to) * 1000;
  if (dist <= meters) return to;
  const f = meters / dist;
  return { lat: from.lat + (to.lat - from.lat) * f, lng: from.lng + (to.lng - from.lng) * f };
}

/** Garde l'écran allumé tant que le chauffeur est en ligne (API Wake Lock, si le téléphone la propose). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () =>
      navigator.wakeLock
        .request("screen")
        .then((l) => {
          lock = l;
        })
        .catch(() => null);
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => null);
    };
  }, [active]);
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
  const [heat, setHeat] = useState<DemandCell[] | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [saver, setSaver] = useState(false);

  const previous = useRef<Ride | null>(null);
  const lastSent = useRef<{ at: number; pos: LatLng | null }>({ at: 0, pos: null });
  const knownRequests = useRef(new Set<number>());
  const requestsLoaded = useRef(false);
  const sheet = useSheetHeight<HTMLDivElement>();

  useEffect(() => {
    const update = () => setSaver(isBatterySaver());
    update();
    window.addEventListener("surplace:preferences", update);
    return () => window.removeEventListener("surplace:preferences", update);
  }, []);

  useWakeLock(profile.isOnline);

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
    // Signal sonore pour toute nouvelle demande (une proposition personnelle a son propre son).
    const fresh = rides.filter((r) => !knownRequests.current.has(r.id));
    // Pas de son au tout premier chargement de la page, ni pendant une course.
    if (fresh.length && requestsLoaded.current && !previous.current) {
      if (fresh.some((r) => r.offerExpiresAt)) {
        beep("offer");
        announce("offer");
      } else {
        beep("request");
        announce("new-request");
      }
    }
    knownRequests.current = new Set(rides.map((r) => r.id));
    requestsLoaded.current = true;
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
    if (event.type === "available-rides" || event.type === "offer") loadAvailable().catch(() => null);
    if (event.type === "ride") loadRide().catch(() => null);
    if (event.type === "profile") loadProfile().catch(() => null);
  }, refreshAll);

  // Compte à rebours des propositions : on rafraîchit l'affichage chaque seconde.
  const [, setTick] = useState(0);
  const hasOffer = available.some((r) => r.offerExpiresAt);
  useEffect(() => {
    if (!hasOffer) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [hasOffer]);

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
      // Économie de batterie : GPS moins précis, lectures moins fréquentes.
      saver
        ? { enableHighAccuracy: false, maximumAge: 30_000, timeout: 30_000 }
        : { enableHighAccuracy: true, maximumAge: 5000, timeout: 15_000 },
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [profile.isOnline, demo, saver]);

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
  // Normal : toutes les 1,5 s au plus pendant une course. Économie : dès 50 m parcourus ou toutes les 20 s.
  useEffect(() => {
    if (!profile.isOnline || !position) return;
    const { at, pos } = lastSent.current;
    const elapsed = Date.now() - at;
    const moved = pos ? haversineKm(pos, position) * 1000 : Infinity;
    const due = saver ? elapsed >= 20_000 || (moved >= 50 && elapsed >= 5000) : elapsed >= (ride ? 1500 : 5000) || moved >= 20;
    if (!due || elapsed < 1500) return;
    lastSent.current = { at: Date.now(), pos: position };
    api("/api/driver/location", position).catch(() => null);
  }, [position, profile.isOnline, saver, ride]);

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
      if (online && position) await api("/api/driver/location", position).catch(() => null);
      const { driver } = await api<{ driver: DriverProfile }>("/api/driver/status", { online });
      setProfile(driver);
      if (online) {
        lastSent.current = { at: 0, pos: null };
        if (pushSupported() && Notification.permission === "default") enablePush().catch(() => null);
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

  const decline = (id: number) =>
    run(`decline-${id}`, async () => {
      await api(`/api/rides/${id}/decline`, {});
      await loadAvailable();
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

  async function toggleHeat() {
    if (heat) {
      setHeat(null);
      return;
    }
    const { cells } = await api<{ cells: DemandCell[] }>(`/api/driver/demand?hour=${new Date().getUTCHours()}`);
    setHeat(cells);
    if (cells.length === 0) setNotice("Pas encore assez de courses pour afficher les zones demandées à cette heure.");
  }

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
      heat={heat ?? undefined}
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

  const subscriptionEndingSoon = subscription?.active && subscription.daysLeft <= 3;

  return (
    <AppShell name={user.name} links={LINKS} role="driver" map={map} topCenter={<span className="hidden sm:block">{onlinePill}</span>}>
      <Sheet ref={sheet.ref}>
        {notice && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{notice}</p>}
        {error && (
          <div className="mb-3">
            <ErrorMessage>{error}</ErrorMessage>
          </div>
        )}
        {profile.documentIssues.length > 0 && !ride && (
          <Link
            href="/chauffeur/profil#documents"
            className={`mb-3 block rounded-xl px-3 py-2 text-sm ${profile.documentsRequired ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}
          >
            📄 {profile.documentsRequired ? "Documents obligatoires" : "Documents à envoyer"} : {profile.documentIssues.join(", ")}.{" "}
            <span className="font-semibold underline">Mettre à jour</span>
          </Link>
        )}

        {profile.status !== "approved" ? (
          <AccountPending status={profile.status} />
        ) : finished ? (
          <Finished ride={finished} onDone={() => setFinished(null)} />
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
              <Button variant={profile.isOnline ? "ghost" : "primary"} onClick={toggleOnline} loading={busy === "online"}>
                {profile.isOnline ? "Passer hors ligne" : "Passer en ligne"}
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setShowSubscription(true)}
              className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm ${subscriptionEndingSoon ? "bg-amber-50 text-amber-800" : "bg-subtle"}`}
            >
              <span>
                <span className="font-semibold">{subscriptionEndingSoon ? "⚠️ Abonnement bientôt expiré" : "Abonnement actif"}</span>
                {subscription && (
                  <span className="block text-xs opacity-80">
                    {subscription.daysLeft} jour{subscription.daysLeft > 1 ? "s" : ""} restant
                    {subscription.daysLeft > 1 ? "s" : ""}
                    {subscription.pending ? " · demande de renouvellement en attente" : ""}
                  </span>
                )}
              </span>
              <span className="font-semibold text-brand">{subscriptionEndingSoon ? "Renouveler" : "Gérer"}</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => toggleHeat().catch((err) => setError((err as Error).message))}
                className={`rounded-2xl px-3 py-3 text-left text-sm ${heat ? "bg-brand text-white" : "bg-subtle"}`}
              >
                <span className="font-semibold">🔥 Zones demandées</span>
                <span className="block text-xs opacity-80">{heat ? "Affichées sur la carte" : "Où sont les clients ?"}</span>
              </button>
              <label className="flex items-center justify-between gap-2 rounded-2xl bg-subtle px-3 py-3 text-sm">
                <span>
                  <span className="font-semibold">Mode démo</span>
                  <span className="block text-xs text-muted">Position simulée</span>
                </span>
                <input
                  type="checkbox"
                  checked={demo}
                  onChange={(e) => setDemo(e.target.checked)}
                  className="h-5 w-5 accent-[var(--color-brand)]"
                />
              </label>
            </div>

            {!profile.isOnline ? (
              <p className="py-4 text-center text-sm text-muted">
                Passez en ligne pour recevoir les demandes de courses autour de vous.
              </p>
            ) : available.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-3xl">📡</p>
                <p className="mt-2 font-semibold">En attente de courses…</p>
                <p className="text-sm text-muted">Les demandes vous seront proposées ici, avec un signal sonore.</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="font-bold">
                  {available.length} demande{available.length > 1 ? "s" : ""} à proximité
                </p>
                {available.map((r) => (
                  <RequestCard
                    key={r.id}
                    ride={r}
                    busy={busy}
                    onAccept={() => accept(r.id)}
                    onDecline={() => decline(r.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Sheet>
    </AppShell>
  );
}

function RequestCard({
  ride,
  busy,
  onAccept,
  onDecline,
}: {
  ride: AvailableRide;
  busy: string | null;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const secondsLeft = ride.offerExpiresAt ? Math.max(0, Math.round((new Date(ride.offerExpiresAt).getTime() - Date.now()) / 1000)) : null;
  return (
    <div className={`space-y-3 rounded-2xl p-4 ${ride.offerExpiresAt ? "border-2 border-brand bg-brand-soft" : "border border-line"}`}>
      {secondsLeft != null && (
        <div className="flex items-center justify-between text-sm font-bold text-brand">
          <span>⚡ Course proposée pour vous</span>
          <span className="rounded-full bg-brand px-2 py-0.5 text-white">{secondsLeft} s</span>
        </div>
      )}
      {ride.scheduledAt && (
        <p className="text-xs font-semibold text-sky-700">
          🕒 Réservée pour {new Date(ride.scheduledAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
        </p>
      )}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Route from={ride.pickup.label} to={ride.dropoff.label} />
        </div>
        <p className="shrink-0 text-lg font-extrabold">{formatFcfa(ride.price)}</p>
      </div>
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
        {ride.pickupDistanceKm != null && <span>À {ride.pickupDistanceKm.toLocaleString("fr-FR")} km</span>}
        <span>· Trajet {ride.distanceKm.toLocaleString("fr-FR")} km</span>
        <span>· {ride.riderName ? `Pour ${ride.riderName}` : ride.passenger.name.split(" ")[0]}</span>
        <span>
          · <Stars value={ride.passenger.rating} />
        </span>
      </p>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={onDecline} loading={busy === `decline-${ride.id}`} className="flex-1">
          {ride.offerExpiresAt ? "Refuser" : "Masquer"}
        </Button>
        <Button onClick={onAccept} loading={busy === `accept-${ride.id}`} className="flex-[2]">
          Accepter
        </Button>
      </div>
    </div>
  );
}

function AccountPending({ status }: { status: DriverProfile["status"] }) {
  return status === "pending" ? (
    <div className="space-y-2 py-4 text-center">
      <p className="text-4xl">⏳</p>
      <p className="text-xl font-extrabold">Compte en cours de validation</p>
      <p className="text-sm text-muted">
        L&apos;équipe SURPLACE vérifie vos informations et vos documents. Vous pourrez passer en ligne dès la validation
        de votre compte. Cette page se mettra à jour automatiquement.
      </p>
      <Link href="/chauffeur/profil#documents" className="inline-block pt-2 text-sm font-semibold text-brand">
        📄 Envoyer mes documents
      </Link>
    </div>
  ) : (
    <div className="space-y-2 py-4 text-center">
      <p className="text-4xl">⛔</p>
      <p className="text-xl font-extrabold">Compte suspendu</p>
      <p className="text-sm text-muted">Contactez le support SURPLACE pour plus d&apos;informations.</p>
    </div>
  );
}

/** Fin de course : montant à encaisser et note du passager. */
function Finished({ ride, onDone }: { ride: Ride; onDone: () => void }) {
  const [rating, setRating] = useState(0);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function rate(n: number) {
    setRating(n);
    setError("");
    try {
      await api(`/api/rides/${ride.id}/rate-passenger`, { rating: n });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-4xl">✅</p>
      <p className="text-xl font-extrabold">Course terminée</p>
      <div className="rounded-2xl bg-brand-soft p-4">
        <p className="text-sm text-muted">Encaissez en espèces</p>
        <p className="text-3xl font-extrabold">{formatFcfa(ride.price)}</p>
        <p className="mt-1 text-xs text-muted">Aucune commission : ce montant est entièrement pour vous.</p>
      </div>
      <div>
        <p className="mb-1 text-sm font-semibold">{sent ? "Merci pour votre avis !" : "Notez le passager"}</p>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              disabled={sent}
              onClick={() => rate(n)}
              className={`text-3xl ${n <= rating ? "text-amber-400" : "text-line"}`}
              aria-label={`${n} étoile${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>
        <ErrorMessage>{error}</ErrorMessage>
      </div>
      <Button onClick={onDone} className="w-full">
        Continuer
      </Button>
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
  // Course commandée pour un proche : c'est cette personne qu'il faut appeler.
  const contactName = ride.riderName ?? ride.passenger.name;
  const contactPhone = ride.riderPhone ?? ride.passenger.phone;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-lg font-extrabold">{next.title}</p>
        <a href={nav} target="_blank" rel="noreferrer" className="rounded-full bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700">
          🧭 GPS
        </a>
      </div>

      <div className="flex items-center gap-3 rounded-2xl bg-subtle p-3">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-contrast font-bold text-on-contrast">
          {contactName.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{contactName}</p>
          <p className="text-sm text-muted">
            {formatPhone(contactPhone)}
            {ride.riderName ? ` · commandé par ${ride.passenger.name}` : ""}
          </p>
          <Stars value={ride.passenger.rating} />
        </div>
        <a
          href={`tel:${contactPhone}`}
          className="grid h-11 w-11 place-items-center rounded-full bg-green-600 text-lg text-white"
          title="Appeler le passager"
        >
          📞
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ShareRideButton rideId={ride.id} />
        <EmergencyButton rideId={ride.id} />
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
