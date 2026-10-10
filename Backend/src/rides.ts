import { randomBytes } from "node:crypto";
import { db } from "./db";
import { documentsBlocking } from "./documents";
import { publish, publishToUser } from "./events";
import { HttpError } from "./http";
import { notifyUser } from "./notifications";
import { haversineKm } from "./pricing";
import { sendPush } from "./push";
import { isSubscriptionActive } from "./subscriptions";
import type { AvailableRide, Place, Ride, RideStatus, TripEstimate, User } from "./types";
import { normalizePhone } from "./validation";

/** Une demande sans chauffeur est annulée automatiquement après ce délai (à partir de l'heure prévue). */
export const REQUEST_TIMEOUT_MIN = 5;
/** Rayon dans lequel un chauffeur voit les demandes. */
export const DISPATCH_RADIUS_KM = 10;
/** Une course réservée devient visible des chauffeurs ce nombre de minutes avant l'heure prévue. */
export const SCHEDULE_LEAD_MIN = 15;
/** Une réservation se fait au moins 20 minutes et au plus 7 jours à l'avance. */
const SCHEDULE_MIN_MIN = 20;
const SCHEDULE_MAX_DAYS = 7;

export const ACTIVE_STATUSES: RideStatus[] = ["requested", "accepted", "arrived", "in_progress"];
export const ACTIVE_SQL = ACTIVE_STATUSES.map((s) => `'${s}'`).join(", ");

const SELECT_RIDE = `
  SELECT r.*,
         p.name AS passenger_name, COALESCE(p.guest_phone, p.phone) AS passenger_phone,
         p.rating_sum AS passenger_rating_sum, p.rating_count AS passenger_rating_count,
         d.name AS driver_name, d.phone AS driver_phone,
         dr.plate, dr.moto_model, dr.lat AS driver_lat, dr.lng AS driver_lng,
         dr.rating_sum, dr.rating_count,
         EXISTS (SELECT 1 FROM driver_documents dd WHERE dd.driver_id = r.driver_id AND dd.type = 'photo') AS driver_has_photo
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

const average = (sum: number, count: number) => (count ? Math.round((sum / count) * 10) / 10 : null);

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
    scheduledAt: r.scheduled_at,
    acceptedAt: r.accepted_at,
    arrivedAt: r.arrived_at,
    startedAt: r.started_at,
    completedAt: r.completed_at,
    cancelledAt: r.cancelled_at,
    cancelledBy: r.cancelled_by,
    rating: r.rating,
    comment: r.comment,
    passengerRating: r.passenger_rating,
    passengerComment: r.passenger_comment,
    riderName: r.rider_name,
    riderPhone: r.rider_phone,
    routeSource: r.route_source,
    passenger: {
      id: row.passenger_id,
      name: r.passenger_name,
      phone: r.passenger_phone,
      rating: average(r.passenger_rating_sum, r.passenger_rating_count),
    },
    driver: row.driver_id
      ? {
          id: row.driver_id,
          name: r.driver_name,
          phone: r.driver_phone,
          plate: r.plate,
          motoModel: r.moto_model,
          rating: average(r.rating_sum, r.rating_count),
          lat: r.driver_lat,
          lng: r.driver_lng,
          hasPhoto: r.driver_has_photo === 1,
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

const iso = (ms: number) => new Date(ms).toISOString();

/** Heure jusqu'à laquelle une course réservée reste invisible des chauffeurs. */
export const visibleUntilIso = () => iso(Date.now() + SCHEDULE_LEAD_MIN * 60_000);

/** Annule les demandes restées sans chauffeur trop longtemps (après l'heure prévue pour une réservation). */
export function expireStaleRequests() {
  const cutoff = iso(Date.now() - REQUEST_TIMEOUT_MIN * 60_000);
  const stale = db
    .prepare(
      `SELECT id, passenger_id, offer_driver_id FROM rides
        WHERE status = 'requested' AND COALESCE(scheduled_at, requested_at) < ?`,
    )
    .all(cutoff) as { id: number; passenger_id: number; offer_driver_id: number | null }[];
  if (stale.length === 0) return;
  const now = new Date().toISOString();
  const update = db.prepare(
    `UPDATE rides SET status = 'cancelled', cancelled_at = ?, cancelled_by = 'timeout',
            offer_driver_id = NULL, offer_expires_at = NULL
      WHERE id = ? AND status = 'requested'`,
  );
  for (const ride of stale) {
    update.run(now, ride.id);
    db.prepare("UPDATE ride_offers SET response = 'expired' WHERE ride_id = ? AND response = 'pending'").run(ride.id);
    publishToUser(ride.passenger_id, { type: "ride", rideId: ride.id });
    publishToUser(ride.offer_driver_id, { type: "available-rides" });
    sendPush(ride.passenger_id, {
      title: "Aucun chauffeur disponible",
      body: "Votre demande a été annulée. Réessayez dans un instant.",
      url: "/passager",
      tag: `ride-${ride.id}`,
    });
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
    )[0] ?? null
  );
}

/**
 * Demandes visibles par un chauffeur : celles qui lui sont proposées (attribution automatique)
 * et celles ouvertes à tous, dans un rayon de 10 km.
 */
export function listAvailableRides(driverId: number): AvailableRide[] {
  expireStaleRequests();
  const driver = db.prepare("SELECT lat, lng FROM drivers WHERE user_id = ?").get(driverId) as
    | { lat: number | null; lng: number | null }
    | undefined;
  const now = new Date().toISOString();
  const rows = db
    .prepare(
      `${SELECT_RIDE}
        WHERE r.status = 'requested'
          AND (r.scheduled_at IS NULL OR r.scheduled_at <= ?)
          AND (r.dispatch_open = 1 OR (r.offer_driver_id = ? AND r.offer_expires_at > ?))
          AND NOT EXISTS (SELECT 1 FROM ride_offers o WHERE o.ride_id = r.id AND o.driver_id = ? AND o.response IN ('declined', 'cancelled'))
        ORDER BY r.requested_at DESC LIMIT 30`,
    )
    .all(visibleUntilIso(), driverId, now, driverId) as RideRow[];
  return rows
    .map((row) => {
      const ride = toRide(row);
      const pickupDistanceKm =
        driver?.lat != null && driver.lng != null
          ? Math.round(haversineKm({ lat: driver.lat, lng: driver.lng }, ride.pickup) * 10) / 10
          : null;
      // Les numéros ne sont communiqués qu'après acceptation.
      return {
        ...ride,
        passenger: { ...ride.passenger, phone: "" },
        riderPhone: ride.riderPhone ? "" : null,
        pickupDistanceKm,
        offerExpiresAt: row.offer_driver_id === driverId ? (row.offer_expires_at as string) : null,
      };
    })
    .filter((r) => r.pickupDistanceKm == null || r.pickupDistanceKm <= DISPATCH_RADIUS_KM)
    .sort((a, b) => Number(!!b.offerExpiresAt) - Number(!!a.offerExpiresAt) || (a.pickupDistanceKm ?? 0) - (b.pickupDistanceKm ?? 0));
}

export function validPlace(p: unknown): p is Place {
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

/** Heure de prise en charge d'une réservation, ou null pour « maintenant ». */
export function parseScheduledAt(input: unknown): Date | null {
  if (input == null || input === "") return null;
  const date = new Date(String(input));
  if (Number.isNaN(date.getTime())) throw new HttpError(400, "Heure de réservation invalide.");
  if (date.getTime() < Date.now() + (SCHEDULE_MIN_MIN - 1) * 60_000) {
    throw new HttpError(400, `Réservez au moins ${SCHEDULE_MIN_MIN} minutes à l'avance, ou commandez maintenant.`);
  }
  if (date.getTime() > Date.now() + SCHEDULE_MAX_DAYS * 86_400_000) {
    throw new HttpError(400, `Réservation possible jusqu'à ${SCHEDULE_MAX_DAYS} jours à l'avance.`);
  }
  return date;
}

export interface RideOptions {
  scheduledAt?: Date | null;
  /** Course commandée pour un proche. */
  rider?: { name: unknown; phone: unknown } | null;
}

export function parseRider(input: unknown): { name: string; phone: string } | null {
  const rider = input as { name?: unknown; phone?: unknown } | null;
  if (!rider || (!rider.name && !rider.phone)) return null;
  const name = String(rider.name ?? "").trim().slice(0, 80);
  if (!name) throw new HttpError(400, "Nom de la personne transportée requis.");
  return { name, phone: normalizePhone(rider.phone) };
}

/**
 * Crée la course. Le trajet (distance, prix) est calculé AVANT par routing.ts › estimateRoute :
 * le prix envoyé par le navigateur n'est jamais utilisé.
 */
export function createRide(passenger: User, pickup: unknown, dropoff: unknown, trip: TripEstimate, options: RideOptions = {}): Ride {
  if (!validPlace(pickup) || !validPlace(dropoff)) {
    throw new HttpError(400, "Départ et destination requis.");
  }
  if (trip.distanceKm < 0.2) throw new HttpError(400, "La destination est trop proche du départ.");
  if (trip.distanceKm > 40) throw new HttpError(400, "Trajet trop long pour un taxi-moto.");
  if (getActiveRide(passenger)) throw new HttpError(409, "Vous avez déjà une course en cours ou réservée.");
  const rider = options.rider ? parseRider(options.rider) : null;

  const result = db
    .prepare(
      `INSERT INTO rides (passenger_id, status, pickup_label, pickup_lat, pickup_lng,
                          dropoff_label, dropoff_lat, dropoff_lng, distance_km, price, requested_at,
                          scheduled_at, rider_name, rider_phone, route_source)
       VALUES (?, 'requested', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      passenger.id,
      pickup.label.trim().slice(0, 200),
      pickup.lat,
      pickup.lng,
      dropoff.label.trim().slice(0, 200),
      dropoff.lat,
      dropoff.lng,
      trip.distanceKm,
      trip.price,
      new Date().toISOString(),
      options.scheduledAt ? options.scheduledAt.toISOString() : null,
      rider?.name ?? null,
      rider?.phone ?? null,
      trip.source,
    );
  return getRide(Number(result.lastInsertRowid))!;
}

export type RideAction = "accept" | "arrive" | "start" | "complete" | "cancel";

function notify(ride: { id: number; passenger_id: number; driver_id: number | null }, driverId?: number | null) {
  publishToUser(ride.passenger_id, { type: "ride", rideId: ride.id });
  publishToUser(ride.driver_id, { type: "ride", rideId: ride.id });
  if (driverId && driverId !== ride.driver_id) publishToUser(driverId, { type: "ride", rideId: ride.id });
}

/** Notification push au passager (téléphone en veille) à chaque étape importante. */
function pushPassenger(passengerId: number, rideId: number, title: string, body: string) {
  sendPush(passengerId, { title, body, url: "/passager", tag: `ride-${rideId}` });
}

/** Vérifie qu'un chauffeur peut prendre une course (validation, abonnement, documents, en ligne, libre). */
export function assertDriverCanWork(user: User) {
  const driver = db
    .prepare("SELECT status, is_online, subscription_until FROM drivers WHERE user_id = ?")
    .get(user.id) as { status: string; is_online: number; subscription_until: string | null } | undefined;
  if (driver?.status !== "approved") throw new HttpError(403, "Votre compte n'est pas encore validé.");
  if (!isSubscriptionActive(driver.subscription_until)) {
    throw new HttpError(402, "Votre abonnement a expiré. Renouvelez-le pour accepter des courses.");
  }
  const blocking = documentsBlocking(user.id);
  if (blocking.length) throw new HttpError(403, `Documents à mettre à jour : ${blocking.join(", ")}.`);
  if (!driver.is_online) throw new HttpError(400, "Passez en ligne pour accepter des courses.");
  if (getActiveRide(user)) throw new HttpError(409, "Terminez d'abord votre course en cours.");
}

export function applyAction(rideId: number, user: User, action: RideAction): Ride {
  const ride = db.prepare("SELECT id, passenger_id, driver_id, status FROM rides WHERE id = ?").get(rideId) as
    | { id: number; passenger_id: number; driver_id: number | null; status: RideStatus }
    | undefined;
  if (!ride) throw new HttpError(404, "Course introuvable.");
  const now = new Date().toISOString();

  if (action === "accept") {
    if (user.role !== "driver") throw new HttpError(403, "Réservé aux chauffeurs.");
    assertDriverCanWork(user);
    // La course doit être ouverte à tous, ou proposée à CE chauffeur (offre encore valable).
    const res = db
      .prepare(
        `UPDATE rides SET status = 'accepted', driver_id = ?, accepted_at = ?, offer_driver_id = NULL, offer_expires_at = NULL
          WHERE id = ? AND status = 'requested'
            AND (scheduled_at IS NULL OR scheduled_at <= ?)
            AND (dispatch_open = 1 OR (offer_driver_id = ? AND offer_expires_at > ?))`,
      )
      .run(user.id, now, rideId, visibleUntilIso(), user.id, now);
    if (res.changes === 0) throw new HttpError(409, "Cette course n'est plus disponible.");
    db.prepare(
      `INSERT INTO ride_offers (ride_id, driver_id, offered_at, response) VALUES (?, ?, ?, 'accepted')
       ON CONFLICT(ride_id, driver_id) DO UPDATE SET response = 'accepted'`,
    ).run(rideId, user.id, now);
    notify({ ...ride, driver_id: user.id });
    publish("drivers", { type: "available-rides" });
    const accepted = getRide(rideId)!;
    pushPassenger(
      ride.passenger_id,
      rideId,
      "Chauffeur trouvé 🏍️",
      `${accepted.driver?.name} arrive (${accepted.driver?.motoModel}, ${accepted.driver?.plate}).`,
    );
    return accepted;
  }

  if (action === "cancel") {
    if (user.role === "passenger" && ride.passenger_id === user.id) {
      if (!["requested", "accepted", "arrived"].includes(ride.status)) {
        throw new HttpError(400, "Cette course ne peut plus être annulée.");
      }
      db.prepare(
        `UPDATE rides SET status = 'cancelled', cancelled_at = ?, cancelled_by = 'passenger',
                offer_driver_id = NULL, offer_expires_at = NULL WHERE id = ?`,
      ).run(now, rideId);
      db.prepare("UPDATE ride_offers SET response = 'expired' WHERE ride_id = ? AND response = 'pending'").run(rideId);
      notify(ride);
      if (ride.driver_id) {
        sendPush(ride.driver_id, { title: "Course annulée", body: "Le passager a annulé la course.", url: "/chauffeur" });
      }
      if (ride.status === "requested") publish("drivers", { type: "available-rides" });
      return getRide(rideId)!;
    }
    if (user.role === "driver" && ride.driver_id === user.id) {
      if (!["accepted", "arrived"].includes(ride.status)) {
        throw new HttpError(400, "Cette course ne peut plus être annulée.");
      }
      // La course retourne dans la file d'attente ; ce chauffeur ne se la verra plus proposer.
      db.transaction(() => {
        db.prepare(
          `UPDATE rides SET status = 'requested', driver_id = NULL, accepted_at = NULL, arrived_at = NULL,
                  requested_at = ?, scheduled_at = NULL, dispatch_open = 0, offer_driver_id = NULL, offer_expires_at = NULL
            WHERE id = ?`,
        ).run(now, rideId);
        db.prepare(
          `INSERT INTO ride_offers (ride_id, driver_id, offered_at, response) VALUES (?, ?, ?, 'cancelled')
           ON CONFLICT(ride_id, driver_id) DO UPDATE SET response = 'cancelled'`,
        ).run(rideId, user.id, now);
      })();
      notify({ ...ride, driver_id: null }, user.id);
      publish("drivers", { type: "available-rides" });
      pushPassenger(ride.passenger_id, rideId, "Le chauffeur a annulé", "Nous recherchons un autre chauffeur…");
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
  if (action === "arrive") pushPassenger(ride.passenger_id, rideId, "Votre chauffeur est arrivé", "Rejoignez-le au point de départ.");
  if (action === "complete") pushPassenger(ride.passenger_id, rideId, "Course terminée 🎉", "Pensez à noter votre chauffeur.");
  return getRide(rideId)!;
}

/** L'administrateur annule une course en cours (passager injoignable, course bloquée…). */
export function adminCancelRide(rideId: number): Ride {
  const ride = db.prepare("SELECT id, passenger_id, driver_id, status FROM rides WHERE id = ?").get(rideId) as
    | { id: number; passenger_id: number; driver_id: number | null; status: RideStatus }
    | undefined;
  if (!ride) throw new HttpError(404, "Course introuvable.");
  if (!ACTIVE_STATUSES.includes(ride.status)) throw new HttpError(409, "Cette course est déjà terminée.");
  db.prepare(
    `UPDATE rides SET status = 'cancelled', cancelled_at = ?, cancelled_by = 'admin',
            offer_driver_id = NULL, offer_expires_at = NULL WHERE id = ?`,
  ).run(new Date().toISOString(), rideId);
  notify(ride);
  publish("drivers", { type: "available-rides" });
  notifyUser(ride.passenger_id, "Course annulée", `La course n°${rideId} a été annulée par l'équipe SURPLACE.`, { url: "/passager" });
  return getRide(rideId)!;
}

function parseRating(rating: number) {
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, "La note doit être comprise entre 1 et 5.");
  }
  return rating;
}

/** Le passager note le chauffeur. */
export function rateRide(rideId: number, passenger: User, rating: number, comment?: string) {
  parseRating(rating);
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

/** Le chauffeur note le passager (visible des chauffeurs sur les demandes suivantes et de l'équipe). */
export function ratePassenger(rideId: number, driver: User, rating: number, comment?: string) {
  parseRating(rating);
  const ride = db
    .prepare("SELECT passenger_id, driver_id, status, passenger_rating FROM rides WHERE id = ?")
    .get(rideId) as { passenger_id: number; driver_id: number; status: string; passenger_rating: number | null } | undefined;
  if (!ride || ride.driver_id !== driver.id) throw new HttpError(404, "Course introuvable.");
  if (ride.status !== "completed") throw new HttpError(400, "La course n'est pas terminée.");
  if (ride.passenger_rating != null) throw new HttpError(409, "Passager déjà noté.");
  db.transaction(() => {
    db.prepare("UPDATE rides SET passenger_rating = ?, passenger_comment = ? WHERE id = ?").run(
      rating,
      comment?.trim().slice(0, 500) || null,
      rideId,
    );
    db.prepare("UPDATE users SET rating_sum = rating_sum + ?, rating_count = rating_count + 1 WHERE id = ?").run(
      rating,
      ride.passenger_id,
    );
  })();
  return getRide(rideId)!;
}

// --- Partage de la course avec un proche ---

/** Lien de suivi d'une course (créé à la première demande). Passager ou chauffeur de la course. */
export function getShareToken(rideId: number, user: User) {
  const ride = db.prepare("SELECT passenger_id, driver_id, status, share_token FROM rides WHERE id = ?").get(rideId) as
    | { passenger_id: number; driver_id: number | null; status: RideStatus; share_token: string | null }
    | undefined;
  if (!ride || (ride.passenger_id !== user.id && ride.driver_id !== user.id)) throw new HttpError(404, "Course introuvable.");
  if (!ACTIVE_STATUSES.includes(ride.status)) throw new HttpError(400, "Cette course est terminée.");
  if (ride.share_token) return ride.share_token;
  const token = randomBytes(12).toString("base64url");
  db.prepare("UPDATE rides SET share_token = ? WHERE id = ?").run(token, rideId);
  return token;
}

/** Ce que voit un proche avec le lien : pas de numéro ni de nom complet du passager. Lien valable 1 h après la fin. */
export function trackSharedRide(token: string) {
  const row = db.prepare(`${SELECT_RIDE} WHERE r.share_token = ?`).get(token) as RideRow | undefined;
  if (!row) throw new HttpError(404, "Lien de suivi introuvable.");
  const ride = toRide(row);
  const endedAt = ride.completedAt ?? ride.cancelledAt;
  if (endedAt && Date.now() - new Date(endedAt).getTime() > 3600_000) throw new HttpError(410, "Ce suivi est terminé.");
  return {
    status: ride.status,
    pickup: ride.pickup,
    dropoff: ride.dropoff,
    updatedAt: new Date().toISOString(),
    driver: ride.driver
      ? {
          name: ride.driver.name,
          plate: ride.driver.plate,
          motoModel: ride.driver.motoModel,
          lat: ride.driver.lat,
          lng: ride.driver.lng,
          photoUrl: ride.driver.hasPhoto ? `/api/public/track/${token}/photo` : null,
        }
      : null,
  };
}

export function driverIdForToken(token: string) {
  const row = db.prepare("SELECT driver_id FROM rides WHERE share_token = ?").get(token) as { driver_id: number | null } | undefined;
  if (!row?.driver_id) throw new HttpError(404, "Pas de chauffeur.");
  return row.driver_id;
}
