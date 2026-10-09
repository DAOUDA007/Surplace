import { db } from "./db";
import { HttpError } from "./http";
import { listContactMessages, listReviewsForAdmin } from "./public";
import { ACTIVE_STATUSES, expireStaleRequests, listRides } from "./rides";
import { getSubscriptionStats, listSubscriptionsForAdmin } from "./subscriptions";
import type { RideStatus } from "./types";

const count = (sql: string, ...params: unknown[]) =>
  (db.prepare(sql).get(...params) as { n: number | null }).n ?? 0;

/** Début de la journée en cours (la Côte d'Ivoire est à UTC+0). */
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Nombre d'éléments en attente d'une action, affichés en pastilles dans le menu. */
export function getAdminCounts() {
  expireStaleRequests();
  return {
    driversPending: count("SELECT COUNT(*) AS n FROM drivers WHERE status = 'pending'"),
    subscriptionsPending: count("SELECT COUNT(*) AS n FROM subscriptions WHERE status = 'pending'"),
    messagesUnread: count("SELECT COUNT(*) AS n FROM contact_messages WHERE handled = 0"),
    activeRides: count(
      `SELECT COUNT(*) AS n FROM rides WHERE status IN (${ACTIVE_STATUSES.map((s) => `'${s}'`).join(", ")})`,
    ),
  };
}

export function getAdminOverview() {
  const today = todayIso();
  const stats = {
    ridesToday: count("SELECT COUNT(*) AS n FROM rides WHERE requested_at >= ?", today),
    completedToday: count("SELECT COUNT(*) AS n FROM rides WHERE status = 'completed' AND completed_at >= ?", today),
    cancelledToday: count("SELECT COUNT(*) AS n FROM rides WHERE status = 'cancelled' AND cancelled_at >= ?", today),
    revenueToday: count("SELECT SUM(price) AS n FROM rides WHERE status = 'completed' AND completed_at >= ?", today),
    revenueTotal: count("SELECT SUM(price) AS n FROM rides WHERE status = 'completed'"),
    ...getSubscriptionStats(),
    passengers: count("SELECT COUNT(*) AS n FROM users WHERE role = 'passenger' AND deleted_at IS NULL"),
    passengersToday: count(
      "SELECT COUNT(*) AS n FROM users WHERE role = 'passenger' AND deleted_at IS NULL AND created_at >= ?",
      today,
    ),
    drivers: count("SELECT COUNT(*) AS n FROM drivers d JOIN users u ON u.id = d.user_id WHERE u.deleted_at IS NULL"),
    driversOnline: count("SELECT COUNT(*) AS n FROM drivers WHERE is_online = 1"),
    ...getAdminCounts(),
  };

  // Courses des 7 derniers jours, pour le graphique.
  const days: { day: string; completed: number; cancelled: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    days.push({
      day,
      completed: count("SELECT COUNT(*) AS n FROM rides WHERE status = 'completed' AND substr(completed_at, 1, 10) = ?", day),
      cancelled: count("SELECT COUNT(*) AS n FROM rides WHERE status = 'cancelled' AND substr(cancelled_at, 1, 10) = ?", day),
    });
  }

  const onlineDrivers = db
    .prepare(
      `SELECT u.id, u.name, d.plate, d.lat, d.lng FROM drivers d JOIN users u ON u.id = d.user_id
        WHERE d.is_online = 1 AND d.lat IS NOT NULL`,
    )
    .all() as { id: number; name: string; plate: string; lat: number; lng: number }[];

  return {
    stats,
    days,
    onlineDrivers,
    activeRides: listRides(`r.status IN (${ACTIVE_STATUSES.map((s) => `'${s}'`).join(", ")})`, [], 20),
  };
}

// --- Courses ---

export function listAdminRides(filters: { status?: string; q?: string; driverId?: number; passengerId?: number }) {
  expireStaleRequests();
  const where: string[] = ["1 = 1"];
  const params: unknown[] = [];
  if (filters.status === "active") {
    where.push(`r.status IN (${ACTIVE_STATUSES.map((s) => `'${s}'`).join(", ")})`);
  } else if (filters.status && ["completed", "cancelled", "requested", "in_progress"].includes(filters.status)) {
    where.push("r.status = ?");
    params.push(filters.status as RideStatus);
  }
  if (filters.driverId) {
    where.push("r.driver_id = ?");
    params.push(filters.driverId);
  }
  if (filters.passengerId) {
    where.push("r.passenger_id = ?");
    params.push(filters.passengerId);
  }
  const q = filters.q?.trim();
  if (q) {
    const like = `%${q}%`;
    where.push(
      `(CAST(r.id AS TEXT) = ? OR p.name LIKE ? OR COALESCE(p.guest_phone, p.phone) LIKE ? OR d.name LIKE ? OR d.phone LIKE ?
        OR r.pickup_label LIKE ? OR r.dropoff_label LIKE ?)`,
    );
    params.push(q.replace(/^#/, ""), like, like, like, like, like, like);
  }
  return listRides(where.join(" AND "), params, 200);
}

// --- Chauffeurs ---

export interface AdminDriver {
  id: number;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
  plate: string;
  motoModel: string;
  licenseNumber: string | null;
  status: "pending" | "approved" | "suspended";
  isOnline: number;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  ratingCount: number;
  completedRides: number;
  earnings: number;
  subscriptionUntil: string | null;
}

export function listAdminDrivers(filters: { status?: string; q?: string }) {
  const where: string[] = ["u.deleted_at IS NULL"];
  const params: unknown[] = [];
  const now = new Date().toISOString();
  switch (filters.status) {
    case "pending":
    case "approved":
    case "suspended":
      where.push("d.status = ?");
      params.push(filters.status);
      break;
    case "online":
      where.push("d.is_online = 1");
      break;
    case "unsubscribed":
      where.push("d.status = 'approved' AND (d.subscription_until IS NULL OR d.subscription_until <= ?)");
      params.push(now);
      break;
  }
  const q = filters.q?.trim();
  if (q) {
    where.push("(u.name LIKE ? OR u.phone LIKE ? OR d.plate LIKE ? OR u.email LIKE ? OR d.license_number LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  return db
    .prepare(
      `SELECT u.id, u.name, u.phone, u.email, u.created_at AS createdAt, d.plate, d.moto_model AS motoModel,
              d.license_number AS licenseNumber,
              d.status, d.is_online AS isOnline, d.lat, d.lng, d.subscription_until AS subscriptionUntil,
              CASE WHEN d.rating_count > 0 THEN ROUND(1.0 * d.rating_sum / d.rating_count, 1) END AS rating,
              d.rating_count AS ratingCount,
              (SELECT COUNT(*) FROM rides r WHERE r.driver_id = u.id AND r.status = 'completed') AS completedRides,
              (SELECT COALESCE(SUM(price), 0) FROM rides r WHERE r.driver_id = u.id AND r.status = 'completed') AS earnings
         FROM drivers d JOIN users u ON u.id = d.user_id
        WHERE ${where.join(" AND ")}
        ORDER BY CASE d.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, u.created_at DESC`,
    )
    .all(...params) as AdminDriver[];
}

// --- Passagers ---

export function listAdminPassengers(filters: { status?: string; q?: string }) {
  const where: string[] = ["u.role = 'passenger'", "u.deleted_at IS NULL"];
  const params: unknown[] = [];
  if (filters.status === "blocked") where.push("u.blocked = 1");
  if (filters.status === "active") where.push("u.blocked = 0");
  const q = filters.q?.trim();
  if (q) {
    where.push("(u.name LIKE ? OR COALESCE(u.guest_phone, u.phone) LIKE ? OR u.email LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  return db
    .prepare(
      `SELECT u.id, u.name, COALESCE(u.guest_phone, u.phone) AS phone, u.email, u.created_at AS createdAt, u.blocked,
              u.guest AS isGuest,
              (SELECT COUNT(*) FROM rides r WHERE r.passenger_id = u.id) AS totalRides,
              (SELECT COUNT(*) FROM rides r WHERE r.passenger_id = u.id AND r.status = 'completed') AS completedRides,
              (SELECT COUNT(*) FROM rides r WHERE r.passenger_id = u.id AND r.status = 'cancelled' AND r.cancelled_by = 'passenger') AS cancelledRides,
              (SELECT COALESCE(SUM(price), 0) FROM rides r WHERE r.passenger_id = u.id AND r.status = 'completed') AS totalSpent,
              (SELECT MAX(requested_at) FROM rides r WHERE r.passenger_id = u.id) AS lastRideAt
         FROM users u
        WHERE ${where.join(" AND ")}
        ORDER BY u.created_at DESC
        LIMIT 500`,
    )
    .all(...params);
}

/** Bloque ou débloque un passager : un compte bloqué est déconnecté et ne peut plus se connecter. */
export function setPassengerBlocked(userId: number, blocked: boolean) {
  const res = db
    .prepare("UPDATE users SET blocked = ? WHERE id = ? AND role = 'passenger'")
    .run(blocked ? 1 : 0, userId);
  if (res.changes === 0) throw new HttpError(404, "Passager introuvable.");
  if (blocked) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
}

// --- Abonnements, avis, messages ---

export const listAdminSubscriptions = () => ({
  stats: getSubscriptionStats(),
  subscriptions: listSubscriptionsForAdmin(),
});
export const listAdminReviews = () => listReviewsForAdmin();
export const listAdminMessages = () => listContactMessages();

// --- Suppressions (contenus ne respectant pas les règles) ---

/** Retire la note d'une course du calcul de la note moyenne du chauffeur. */
function removeRatingFromDriver(ride: { driver_id: number | null; rating: number | null }) {
  if (ride.driver_id && ride.rating != null) {
    db.prepare(
      "UPDATE drivers SET rating_sum = rating_sum - ?, rating_count = MAX(rating_count - 1, 0) WHERE user_id = ?",
    ).run(ride.rating, ride.driver_id);
  }
}

export function deleteRide(rideId: number) {
  const ride = db.prepare("SELECT status, driver_id, rating FROM rides WHERE id = ?").get(rideId) as
    | { status: RideStatus; driver_id: number | null; rating: number | null }
    | undefined;
  if (!ride) throw new HttpError(404, "Course introuvable.");
  if (ACTIVE_STATUSES.includes(ride.status)) {
    throw new HttpError(409, "Cette course est en cours : annulez-la avant de la supprimer.");
  }
  db.transaction(() => {
    removeRatingFromDriver(ride);
    db.prepare("DELETE FROM rides WHERE id = ?").run(rideId);
  })();
}

/** Supprime la note et le commentaire d'une course ; le passager n'est plus invité à noter. */
export function deleteReview(rideId: number) {
  const ride = db.prepare("SELECT driver_id, rating FROM rides WHERE id = ?").get(rideId) as
    | { driver_id: number | null; rating: number | null }
    | undefined;
  if (!ride || ride.rating == null) throw new HttpError(404, "Avis introuvable.");
  db.transaction(() => {
    removeRatingFromDriver(ride);
    db.prepare("UPDATE rides SET rating = NULL, comment = NULL, review_hidden = 1 WHERE id = ?").run(rideId);
  })();
}

export function deleteMessage(messageId: number) {
  const res = db.prepare("DELETE FROM contact_messages WHERE id = ?").run(messageId);
  if (res.changes === 0) throw new HttpError(404, "Message introuvable.");
}
