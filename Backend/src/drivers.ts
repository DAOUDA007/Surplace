import { db } from "./db";
import { documentIssues, documentsBlocking } from "./documents";
import { publish, publishToUser } from "./events";
import { HttpError } from "./http";
import { notifyUser } from "./notifications";
import { getSettings } from "./settings";
import { enforceSubscription, isSubscriptionActive } from "./subscriptions";
import type { DriverProfile, User } from "./types";

interface DriverRow {
  plate: string;
  moto_model: string;
  license_number: string | null;
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
  const referral = db.prepare("SELECT referral_code FROM users WHERE id = ?").get(userId) as { referral_code: string | null };
  return {
    plate: row.plate,
    motoModel: row.moto_model,
    licenseNumber: row.license_number,
    status: row.status,
    isOnline: row.is_online === 1,
    lat: row.lat,
    lng: row.lng,
    rating: row.rating_count ? Math.round((row.rating_sum / row.rating_count) * 10) / 10 : null,
    subscriptionUntil: row.subscription_until,
    subscriptionActive: isSubscriptionActive(row.subscription_until),
    documentIssues: documentIssues(userId),
    documentsRequired: getSettings().documentsRequired,
    referralCode: referral?.referral_code ?? null,
  };
}

// --- Temps passé en ligne (statistiques du chauffeur) ---

export function startOnlineSession(driverId: number) {
  const open = db.prepare("SELECT 1 FROM driver_online_log WHERE driver_id = ? AND ended_at IS NULL").get(driverId);
  if (!open) {
    db.prepare("INSERT INTO driver_online_log (driver_id, started_at) VALUES (?, ?)").run(driverId, new Date().toISOString());
  }
}

export function endOnlineSession(driverId: number) {
  db.prepare("UPDATE driver_online_log SET ended_at = ? WHERE driver_id = ? AND ended_at IS NULL").run(
    new Date().toISOString(),
    driverId,
  );
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
  const blocking = online ? documentsBlocking(user.id) : [];
  if (blocking.length) {
    throw new HttpError(403, `Mettez à jour vos documents pour passer en ligne : ${blocking.join(", ")}.`);
  }
  if (!online) {
    const active = db
      .prepare("SELECT 1 FROM rides WHERE driver_id = ? AND status IN ('accepted', 'arrived', 'in_progress')")
      .get(user.id);
    if (active) throw new HttpError(409, "Terminez votre course avant de passer hors ligne.");
  }
  db.prepare("UPDATE drivers SET is_online = ? WHERE user_id = ?").run(online ? 1 : 0, user.id);
  if (online) startOnlineSession(user.id);
  else endOnlineSession(user.id);
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
  const previous = db.prepare("SELECT status FROM drivers WHERE user_id = ?").get(userId) as { status: string } | undefined;
  if (!previous) throw new HttpError(404, "Chauffeur introuvable.");
  db.prepare(
    `UPDATE drivers SET status = ?, is_online = CASE WHEN ? = 'suspended' THEN 0 ELSE is_online END
      WHERE user_id = ?`,
  ).run(status, status, userId);
  if (status === "suspended") endOnlineSession(userId);
  publishToUser(userId, { type: "profile" });
  publish("drivers", { type: "available-rides" });
  if (status === "approved" && previous.status !== "approved") {
    notifyUser(userId, "Compte validé ✅", "Votre compte chauffeur est validé. Passez en ligne pour recevoir des courses.", {
      url: "/chauffeur",
      sms: true,
    });
  }
  if (status === "suspended" && previous.status === "approved") {
    notifyUser(userId, "Compte suspendu", "Votre compte chauffeur a été suspendu. Contactez SURPLACE.", { url: "/chauffeur" });
  }
}
