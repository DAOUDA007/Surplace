import { db } from "./db";
import { documentsBlocking } from "./documents";
import { publish, publishToUser } from "./events";
import { HttpError } from "./http";
import { haversineKm } from "./pricing";
import { sendPush } from "./push";
import { ACTIVE_SQL, DISPATCH_RADIUS_KM, expireStaleRequests, visibleUntilIso } from "./rides";
import { getSettings } from "./settings";

/**
 * Attribution des demandes aux chauffeurs.
 *
 * Mode « auto » (par défaut) : la demande est proposée au chauffeur disponible le plus proche, qui a
 * quelques secondes pour accepter ou refuser ; puis au suivant. Après `maxOffers` chauffeurs, ou s'il n'y a
 * aucun chauffeur disponible, la demande est ouverte à tous les chauffeurs proches (premier qui accepte).
 * Mode « open » : toutes les demandes sont tout de suite visibles par tous les chauffeurs proches.
 *
 * dispatchTick() est appelée toutes les 3 secondes (server.ts) et juste après chaque nouvelle demande.
 */

interface PendingRide {
  id: number;
  pickup_lat: number;
  pickup_lng: number;
  price: number;
  pickup_label: string;
  offer_driver_id: number | null;
  offer_expires_at: string | null;
  dispatch_open: number;
}

/** Chauffeurs pouvant recevoir une proposition pour cette course, du plus proche au plus lointain. */
function eligibleDrivers(ride: PendingRide, now: string) {
  const freshSince = new Date(Date.now() - 10 * 60_000).toISOString();
  const rows = db
    .prepare(
      `SELECT d.user_id AS id, d.lat, d.lng FROM drivers d JOIN users u ON u.id = d.user_id
        WHERE d.status = 'approved' AND d.is_online = 1 AND u.blocked = 0 AND u.deleted_at IS NULL
          AND d.subscription_until > ? AND d.lat IS NOT NULL AND d.location_at > ?
          AND NOT EXISTS (SELECT 1 FROM rides r WHERE r.driver_id = d.user_id AND r.status IN (${ACTIVE_SQL}))
          AND NOT EXISTS (SELECT 1 FROM rides r WHERE r.offer_driver_id = d.user_id AND r.status = 'requested' AND r.offer_expires_at > ?)
          AND NOT EXISTS (SELECT 1 FROM ride_offers o WHERE o.ride_id = ? AND o.driver_id = d.user_id)`,
    )
    .all(now, freshSince, now, ride.id) as { id: number; lat: number; lng: number }[];
  return rows
    .map((d) => ({ ...d, distanceKm: haversineKm(d, { lat: ride.pickup_lat, lng: ride.pickup_lng }) }))
    .filter((d) => d.distanceKm <= DISPATCH_RADIUS_KM && documentsBlocking(d.id).length === 0)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Ouvre la demande à tous les chauffeurs proches et prévient ceux qui sont en ligne. */
function openRide(ride: PendingRide) {
  db.prepare("UPDATE rides SET dispatch_open = 1, offer_driver_id = NULL, offer_expires_at = NULL WHERE id = ?").run(ride.id);
  publish("drivers", { type: "available-rides" });
  const online = db
    .prepare("SELECT user_id AS id, lat, lng FROM drivers WHERE is_online = 1 AND status = 'approved' AND lat IS NOT NULL")
    .all() as { id: number; lat: number; lng: number }[];
  for (const d of online) {
    if (haversineKm(d, { lat: ride.pickup_lat, lng: ride.pickup_lng }) <= DISPATCH_RADIUS_KM) {
      sendPush(d.id, { title: "Nouvelle demande à proximité", body: ride.pickup_label, url: "/chauffeur", tag: "requests" });
    }
  }
}

export function dispatchTick() {
  expireStaleRequests();
  const settings = getSettings();
  const now = new Date().toISOString();
  const rides = db
    .prepare(
      `SELECT id, pickup_lat, pickup_lng, price, pickup_label, offer_driver_id, offer_expires_at, dispatch_open
         FROM rides WHERE status = 'requested' AND dispatch_open = 0 AND (scheduled_at IS NULL OR scheduled_at <= ?)
        ORDER BY requested_at`,
    )
    .all(visibleUntilIso()) as PendingRide[];

  for (const ride of rides) {
    if (settings.dispatch.mode === "open") {
      openRide(ride);
      continue;
    }
    // Proposition en cours, encore valable : on attend la réponse.
    if (ride.offer_driver_id && ride.offer_expires_at && ride.offer_expires_at > now) continue;

    // Proposition expirée sans réponse.
    if (ride.offer_driver_id) {
      db.prepare("UPDATE ride_offers SET response = 'expired' WHERE ride_id = ? AND driver_id = ? AND response = 'pending'").run(
        ride.id,
        ride.offer_driver_id,
      );
      publishToUser(ride.offer_driver_id, { type: "available-rides" });
    }

    const offered = (db.prepare("SELECT COUNT(*) AS n FROM ride_offers WHERE ride_id = ? AND response != 'cancelled'").get(ride.id) as {
      n: number;
    }).n;
    const candidate = offered < settings.dispatch.maxOffers ? eligibleDrivers(ride, now)[0] : undefined;
    if (!candidate) {
      openRide(ride);
      continue;
    }

    const expires = new Date(Date.now() + settings.dispatch.offerSeconds * 1000).toISOString();
    db.transaction(() => {
      db.prepare("INSERT INTO ride_offers (ride_id, driver_id, offered_at) VALUES (?, ?, ?)").run(ride.id, candidate.id, now);
      db.prepare("UPDATE rides SET offer_driver_id = ?, offer_expires_at = ? WHERE id = ?").run(candidate.id, expires, ride.id);
    })();
    publishToUser(candidate.id, { type: "offer", rideId: ride.id });
    sendPush(candidate.id, {
      title: "🏍️ Course proposée",
      body: `${ride.pickup_label} · à ${candidate.distanceKm.toFixed(1)} km. Répondez vite !`,
      url: "/chauffeur",
      tag: "offer",
    });
  }
}

/** Le chauffeur refuse la proposition : elle passe tout de suite au chauffeur suivant. */
export function declineOffer(rideId: number, driverId: number) {
  const res = db
    .prepare("UPDATE rides SET offer_driver_id = NULL, offer_expires_at = NULL WHERE id = ? AND offer_driver_id = ? AND status = 'requested'")
    .run(rideId, driverId);
  db.prepare(
    `INSERT INTO ride_offers (ride_id, driver_id, offered_at, response) VALUES (?, ?, ?, 'declined')
     ON CONFLICT(ride_id, driver_id) DO UPDATE SET response = 'declined'`,
  ).run(rideId, driverId, new Date().toISOString());
  if (res.changes === 0) {
    // Course ouverte à tous : le chauffeur la masque simplement de sa liste.
    const exists = db.prepare("SELECT 1 FROM rides WHERE id = ? AND status = 'requested'").get(rideId);
    if (!exists) throw new HttpError(409, "Cette course n'est plus disponible.");
  }
  dispatchTick();
}

export function startDispatchLoop() {
  setInterval(() => {
    try {
      dispatchTick();
    } catch (err) {
      console.error("[attribution]", err);
    }
  }, 3000).unref();
}
