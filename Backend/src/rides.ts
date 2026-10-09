import { db } from "./db";
import { publish, publishToUser } from "./events";
import { HttpError } from "./http";
import { estimateTrip, haversineKm } from "./pricing";
import { isSubscriptionActive } from "./subscriptions";
import type { Place, Ride, RideStatus, User } from "./types";

/** Une demande sans chauffeur est annulée automatiquement après ce délai. */
export const REQUEST_TIMEOUT_MIN = 5;
/** Rayon dans lequel un chauffeur voit les demandes. */
export const DISPATCH_RADIUS_KM = 10;

export const ACTIVE_STATUSES: RideStatus[] = ["requested", "accepted", "arrived", "in_progress"];
const ACTIVE_SQL = ACTIVE_STATUSES.map((s) => `'${s}'`).join(", ");

const SELECT_RIDE = `
  SELECT r.*,
         p.name AS passenger_name, COALESCE(p.guest_phone, p.phone) AS passenger_phone,
         d.name AS driver_name, d.phone AS driver_phone,
         dr.plate, dr.moto_model, dr.lat AS driver_lat, dr.lng AS driver_lng,
         dr.rating_sum, dr.rating_count
    FROM rides r
    JOIN users p ON p.id = r.passenger_id
    LEFT JOIN users d ON d.id = r.driver_id
    LEFT JOIN drivers dr ON dr.user_id = r.driver_id
`;

type RideRow = Record<string, unknown> & {
  id: number;
  passenger_id: number;
  driver_id: number | null;
  status: RideStatus;
};

function toRide(row: RideRow): Ride {
  const r = row as unknown as Record<string, never>;
  return {
    id: row.id,
    status: row.status,
    pickup: { label: r.pickup_label, lat: r.pickup_lat, lng: r.pickup_lng },
    dropoff: { label: r.dropoff_label, lat: r.dropoff_lat, lng: r.dropoff_lng },
    distanceKm: r.distance_km,
    price: r.price,
    paymentMethod: "cash",
    requestedAt: r.requested_at,
    acceptedAt: r.accepted_at,
    arrivedAt: r.arrived_at,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    cancelledAt: r.cancelled_at,
    cancelledBy: r.cancelled_by,
    rating: r.rating,
    comment: r.comment,
    passenger: { id: row.passenger_id, name: r.passenger_name, phone: r.passenger_phone },
    driver: row.driver_id
      ? {
          id: row.driver_id,
          name: r.driver_name,
          phone: r.driver_phone,
          plate: r.plate,
          motoModel: r.moto_model,
          rating: r.rating_count ? Math.round((r.rating_sum / r.rating_count) * 10) / 10 : null,
          lat: r.driver_lat,
          lng: r.driver_lng,
        }
      : null,
  };
}

export function getRide(id: number): Ride | null {
  const row = db.prepare(`${SELECT_RIDE} WHERE r.id = ?`).get(id) as RideRow | undefined;
  return row ? toRide(row) : null;
}

export function listRides(where: string, params: unknown[], limit = 50): Ride[] {
  const rows = db
    .prepare(`${SELECT_RIDE} WHERE ${where} ORDER BY r.requested_at DESC LIMIT ${limit}`)
    .all(...params) as RideRow[];
  return rows.map(toRide);
}

/** Annule les demandes restées sans chauffeur trop longtemps. */
export function expireStaleRequests() {
  const cutoff = new Date(Date.now() - REQUEST_TIMEOUT_MIN * 60_000).toISOString();
  const stale = db
    .prepare("SELECT id, passenger_id FROM rides WHERE status = 'requested' AND requested_at < ?")
    .all(cutoff) as { id: number; passenger_id: number }[];
  if (stale.length === 0) return;
  const now = new Date().toISOString();
  const update = db.prepare(
    "UPDATE rides SET status = 'cancelled', cancelled_at = ?, cancelled_by = 'timeout' WHERE id = ? AND status = 'requested'",
  );
  for (const ride of stale) {
    update.run(now, ride.id);
    publishToUser(ride.passenger_id, { type: "ride", rideId: ride.id });
  }
  publish("drivers", { type: "available-rides" });
}

export function getActiveRide(user: User): Ride | null {
  expireStaleRequests();
  const column = user.role === "driver" ? "r.driver_id" : "r.passenger_id";
  return listRides(`${column} = ? AND r.status IN (${ACTIVE_SQL})`, [user.id], 1)[0] ?? null;
}

/** Dernière course terminée du passager, si elle n'a pas encore été notée. */
export function getRideToRate(passengerId: number): Ride | null {
  return (
    listRides(
      "r.passenger_id = ? AND r.status = 'completed' AND r.rating IS NULL AND r.review_hidden = 0",
      [passengerId],
      1,
    )[0] ??
    null
  );
}

export function listAvailableRides(driverId: number) {
  expireStaleRequests();
  const driver = db.prepare("SELECT lat, lng FROM drivers WHERE user_id = ?").get(driverId) as
    | { lat: number | null; lng: number | null }
    | undefined;
  const rides = listRides("r.status = 'requested'", [], 30);
  return rides
    .map((ride) => {
      const pickupDistanceKm =
        driver?.lat != null && driver.lng != null
          ? Math.round(haversineKm({ lat: driver.lat, lng: driver.lng }, ride.pickup) * 10) / 10
          : null;
      // Le numéro du passager n'est communiqué qu'après acceptation.
      return { ...ride, passenger: { ...ride.passenger, phone: "" }, pickupDistanceKm };
    })
    .filter((r) => r.pickupDistanceKm == null || r.pickupDistanceKm <= DISPATCH_RADIUS_KM)
    .sort((a, b) => (a.pickupDistanceKm ?? 0) - (b.pickupDistanceKm ?? 0));
}

function validPlace(p: unknown): p is Place {
  const place = p as Place;
  return (
    !!place &&
    typeof place.label === "string" &&
    place.label.trim().length > 0 &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lng) &&
    Math.abs(place.lat) <= 90 &&
    Math.abs(place.lng) <= 180
  );
}

export function createRide(passenger: User, pickup: unknown, dropoff: unknown): Ride {
  if (!validPlace(pickup) || !validPlace(dropoff)) {
    throw new HttpError(400, "Départ et destination requis.");
  }
  const { distanceKm, price } = estimateTrip(pickup, dropoff);
  if (distanceKm < 0.2) throw new HttpError(400, "La destination est trop proche du départ.");
  if (distanceKm > 40) throw new HttpError(400, "Trajet trop long pour un taxi-moto.");
  if (getActiveRide(passenger)) throw new HttpError(409, "Vous avez déjà une course en cours.");

  const result = db
    .prepare(
      `INSERT INTO rides (passenger_id, status, pickup_label, pickup_lat, pickup_lng,
                          dropoff_label, dropoff_lat, dropoff_lng, distance_km, price, requested_at)
       VALUES (?, 'requested', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      passenger.id,
      pickup.label.trim().slice(0, 200),
      pickup.lat,
      pickup.lng,
      dropoff.label.trim().slice(0, 200),
      dropoff.lat,
      dropoff.lng,
      distanceKm,
      price,
      new Date().toISOString(),
    );
  publish("drivers", { type: "available-rides" });
  return getRide(Number(result.lastInsertRowid))!;
}

export type RideAction = "accept" | "arrive" | "start" | "complete" | "cancel";

function notify(ride: { id: number; passenger_id: number; driver_id: number | null }, driverId?: number | null) {
  publishToUser(ride.passenger_id, { type: "ride", rideId: ride.id });
  publishToUser(ride.driver_id, { type: "ride", rideId: ride.id });
  if (driverId && driverId !== ride.driver_id) publishToUser(driverId, { type: "ride", rideId: ride.id });
}

export function applyAction(rideId: number, user: User, action: RideAction): Ride {
  const ride = db.prepare("SELECT id, passenger_id, driver_id, status FROM rides WHERE id = ?").get(rideId) as
    | { id: number; passenger_id: number; driver_id: number | null; status: RideStatus }
    | undefined;
  if (!ride) throw new HttpError(404, "Course introuvable.");
  const now = new Date().toISOString();

  if (action === "accept") {
    if (user.role !== "driver") throw new HttpError(403, "Réservé aux chauffeurs.");
    const driver = db
      .prepare("SELECT status, is_online, subscription_until FROM drivers WHERE user_id = ?")
      .get(user.id) as { status: string; is_online: number; subscription_until: string | null } | undefined;
    if (driver?.status !== "approved") throw new HttpError(403, "Votre compte n'est pas encore validé.");
    if (!isSubscriptionActive(driver.subscription_until)) {
      throw new HttpError(402, "Votre abonnement a expiré. Renouvelez-le pour accepter des courses.");
    }
    if (!driver.is_online) throw new HttpError(400, "Passez en ligne pour accepter des courses.");
    if (getActiveRide(user)) throw new HttpError(409, "Terminez d'abord votre course en cours.");
    const res = db
      .prepare(
        "UPDATE rides SET status = 'accepted', driver_id = ?, accepted_at = ? WHERE id = ? AND status = 'requested'",
      )
      .run(user.id, now, rideId);
    if (res.changes === 0) throw new HttpError(409, "Cette course n'est plus disponible.");
    notify({ ...ride, driver_id: user.id });
    publish("drivers", { type: "available-rides" });
    return getRide(rideId)!;
  }

  if (action === "cancel") {
    if (user.role === "passenger" && ride.passenger_id === user.id) {
      if (!["requested", "accepted", "arrived"].includes(ride.status)) {
        throw new HttpError(400, "Cette course ne peut plus être annulée.");
      }
      db.prepare(
        "UPDATE rides SET status = 'cancelled', cancelled_at = ?, cancelled_by = 'passenger' WHERE id = ?",
      ).run(now, rideId);
      notify(ride);
      if (ride.status === "requested") publish("drivers", { type: "available-rides" });
      return getRide(rideId)!;
    }
    if (user.role === "driver" && ride.driver_id === user.id) {
      if (!["accepted", "arrived"].includes(ride.status)) {
        throw new HttpError(400, "Cette course ne peut plus être annulée.");
      }
      // La course retourne dans la file d'attente pour qu'un autre chauffeur la prenne.
      db.prepare(
        "UPDATE rides SET status = 'requested', driver_id = NULL, accepted_at = NULL, arrived_at = NULL, requested_at = ? WHERE id = ?",
      ).run(now, rideId);
      notify({ ...ride, driver_id: null }, user.id);
      publish("drivers", { type: "available-rides" });
      return getRide(rideId)!;
    }
    throw new HttpError(403, "Accès refusé.");
  }

  // Étapes réservées au chauffeur assigné.
  if (user.role !== "driver" || ride.driver_id !== user.id) throw new HttpError(403, "Accès refusé.");
  const steps: Record<Exclude<RideAction, "accept" | "cancel">, [RideStatus, RideStatus, string]> = {
    arrive: ["accepted", "arrived", "arrived_at"],
    start: ["arrived", "in_progress", "started_at"],
    complete: ["in_progress", "completed", "completed_at"],
  };
  const [from, to, column] = steps[action];
  const res = db
    .prepare(`UPDATE rides SET status = ?, ${column} = ? WHERE id = ? AND status = ?`)
    .run(to, now, rideId, from);
  if (res.changes === 0) throw new HttpError(409, "Action impossible à cette étape de la course.");
  notify(ride);
  return getRide(rideId)!;
}

/** L'administrateur annule une course en cours (passager injoignable, course bloquée…). */
export function adminCancelRide(rideId: number): Ride {
  const ride = db.prepare("SELECT id, passenger_id, driver_id, status FROM rides WHERE id = ?").get(rideId) as
    | { id: number; passenger_id: number; driver_id: number | null; status: RideStatus }
    | undefined;
  if (!ride) throw new HttpError(404, "Course introuvable.");
  if (!ACTIVE_STATUSES.includes(ride.status)) throw new HttpError(409, "Cette course est déjà terminée.");
  db.prepare("UPDATE rides SET status = 'cancelled', cancelled_at = ?, cancelled_by = 'admin' WHERE id = ?").run(
    new Date().toISOString(),
    rideId,
  );
  notify(ride);
  publish("drivers", { type: "available-rides" });
  return getRide(rideId)!;
}

export function rateRide(rideId: number, passenger: User, rating: number, comment?: string) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, "La note doit être comprise entre 1 et 5.");
  }
  const ride = db
    .prepare("SELECT passenger_id, driver_id, status, rating FROM rides WHERE id = ?")
    .get(rideId) as { passenger_id: number; driver_id: number; status: string; rating: number | null } | undefined;
  if (!ride || ride.passenger_id !== passenger.id) throw new HttpError(404, "Course introuvable.");
  if (ride.status !== "completed") throw new HttpError(400, "La course n'est pas terminée.");
  if (ride.rating != null) throw new HttpError(409, "Course déjà notée.");

  db.transaction(() => {
    db.prepare("UPDATE rides SET rating = ?, comment = ? WHERE id = ?").run(
      rating,
      comment?.trim().slice(0, 500) || null,
      rideId,
    );
    db.prepare(
      "UPDATE drivers SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE user_id = ?",
    ).run(rating, ride.driver_id);
  })();
  return getRide(rideId)!;
}
