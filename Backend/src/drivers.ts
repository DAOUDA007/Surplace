import { db } from "./db";
import { publish, publishToUser } from "./events";
import { HttpError } from "./http";
import { enforceSubscription, isSubscriptionActive } from "./subscriptions";
import type { DriverProfile, User } from "./types";

interface DriverRow {
  plate: string;
  moto_model: string;
  status: DriverProfile["status"];
  is_online: number;
  lat: number | null;
  lng: number | null;
  rating_sum: number;
  rating_count: number;
  subscription_until: string | null;
}

export function getDriverProfile(userId: number): DriverProfile | null {
  enforceSubscription(userId);
  const row = db.prepare("SELECT * FROM drivers WHERE user_id = ?").get(userId) as DriverRow | undefined;
  if (!row) return null;
  return {
    plate: row.plate,
    motoModel: row.moto_model,
    status: row.status,
    isOnline: row.is_online === 1,
    lat: row.lat,
    lng: row.lng,
    rating: row.rating_count ? Math.round((row.rating_sum / row.rating_count) * 10) / 10 : null,
    subscriptionUntil: row.subscription_until,
    subscriptionActive: isSubscriptionActive(row.subscription_until),
  };
}

export function setDriverOnline(user: User, online: boolean): DriverProfile {
  const profile = getDriverProfile(user.id);
  if (!profile) throw new HttpError(404, "Profil chauffeur introuvable.");
  if (online && profile.status !== "approved") {
    throw new HttpError(403, "Votre compte doit être validé par SURPLACE avant de passer en ligne.");
  }
  if (online && !profile.subscriptionActive) {
    throw new HttpError(402, "Un abonnement actif est nécessaire pour passer en ligne.");
  }
  if (!online) {
    const active = db
      .prepare("SELECT 1 FROM rides WHERE driver_id = ? AND status IN ('accepted', 'arrived', 'in_progress')")
      .get(user.id);
    if (active) throw new HttpError(409, "Terminez votre course avant de passer hors ligne.");
  }
  db.prepare("UPDATE drivers SET is_online = ? WHERE user_id = ?").run(online ? 1 : 0, user.id);
  return getDriverProfile(user.id)!;
}

export function updateDriverLocation(user: User, lat: number, lng: number) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    throw new HttpError(400, "Position invalide.");
  }
  db.prepare("UPDATE drivers SET lat = ?, lng = ?, location_at = ? WHERE user_id = ?").run(
    lat,
    lng,
    new Date().toISOString(),
    user.id,
  );
  // Le passager de la course en cours suit le chauffeur en direct.
  const ride = db
    .prepare(
      "SELECT id, passenger_id FROM rides WHERE driver_id = ? AND status IN ('accepted', 'arrived', 'in_progress')",
    )
    .get(user.id) as { id: number; passenger_id: number } | undefined;
  if (ride) publishToUser(ride.passenger_id, { type: "location", rideId: ride.id, lat, lng });
}

export function setDriverStatus(userId: number, status: "approved" | "suspended") {
  const res = db
    .prepare(
      `UPDATE drivers SET status = ?, is_online = CASE WHEN ? = 'suspended' THEN 0 ELSE is_online END
        WHERE user_id = ?`,
    )
    .run(status, status, userId);
  if (res.changes === 0) throw new HttpError(404, "Chauffeur introuvable.");
  publishToUser(userId, { type: "profile" });
  publish("drivers", { type: "available-rides" });
}
