import { SITE_URL } from "./config";
import { db } from "./db";
import { publish } from "./events";
import { HttpError } from "./http";
import { RateLimiter } from "./limits";
import { sendPush } from "./push";
import { ACTIVE_STATUSES, getRide, getShareToken } from "./rides";
import { sendSmsInBackground } from "./sms";
import type { EmergencyAlert, RideStatus, User } from "./types";

/**
 * Bouton d'urgence 🆘 (passager ou chauffeur, pendant une course).
 * - l'alerte apparaît en rouge dans l'administration (et en notification push pour l'équipe) ;
 * - la personne à prévenir (profil) reçoit un SMS avec le lien de suivi de la course.
 */
const byUser = new RateLimiter(3, 10 * 60_000);

export function createAlert(user: User, body: Record<string, unknown>) {
  byUser.check(String(user.id), "Alerte déjà envoyée. L'équipe SURPLACE a été prévenue.");
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  const hasPos = Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

  let rideId: number | null = null;
  let shareUrl: string | null = null;
  if (body.rideId != null) {
    rideId = Number(body.rideId);
    const ride = db.prepare("SELECT passenger_id, driver_id, status FROM rides WHERE id = ?").get(rideId) as
      | { passenger_id: number; driver_id: number | null; status: RideStatus }
      | undefined;
    if (!ride || (ride.passenger_id !== user.id && ride.driver_id !== user.id)) throw new HttpError(404, "Course introuvable.");
    if (ACTIVE_STATUSES.includes(ride.status)) shareUrl = `${SITE_URL}/suivi/${getShareToken(rideId, user)}`;
  }

  const id = Number(
    db
      .prepare("INSERT INTO emergency_alerts (ride_id, user_id, lat, lng, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(rideId, user.id, hasPos ? lat : null, hasPos ? lng : null, new Date().toISOString()).lastInsertRowid,
  );
  byUser.hit(String(user.id));

  // Équipe : événement temps réel + notification sur les téléphones des administrateurs.
  publish("admins", { type: "alert" });
  const admins = db.prepare("SELECT id FROM users WHERE role = 'admin' AND blocked = 0 AND deleted_at IS NULL").all() as { id: number }[];
  for (const a of admins) {
    sendPush(a.id, { title: "🆘 ALERTE URGENCE", body: `${user.name} a déclenché le bouton d'urgence.`, url: "/alertes", tag: `alert-${id}` });
  }

  // Personne à prévenir.
  const contact = db.prepare("SELECT emergency_contact_name, emergency_contact_phone FROM users WHERE id = ?").get(user.id) as {
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
  };
  let contactNotified = false;
  if (contact.emergency_contact_phone) {
    const where = hasPos ? ` Position : https://maps.google.com/?q=${lat},${lng}` : "";
    sendSmsInBackground(
      contact.emergency_contact_phone,
      `SURPLACE - URGENCE : ${user.name} a demandé de l'aide pendant une course.${shareUrl ? ` Suivi en direct : ${shareUrl}` : ""}${where}`,
    );
    contactNotified = true;
  }
  return { id, shareUrl, contactNotified };
}

export function listAlerts(status?: string): EmergencyAlert[] {
  const where = status === "open" ? "WHERE a.handled_at IS NULL" : "";
  const rows = db
    .prepare(
      `SELECT a.id, a.ride_id AS rideId, a.lat, a.lng, a.created_at AS createdAt, a.handled_at AS handledAt,
              a.handled_by AS handledBy, a.note, u.name AS userName, u.role AS userRole,
              COALESCE(u.guest_phone, u.phone) AS userPhone,
              CASE WHEN u.emergency_contact_phone IS NOT NULL THEN u.emergency_contact_name || ' · ' || u.emergency_contact_phone END AS emergencyContact
         FROM emergency_alerts a JOIN users u ON u.id = a.user_id ${where}
        ORDER BY CASE WHEN a.handled_at IS NULL THEN 0 ELSE 1 END, a.id DESC LIMIT 200`,
    )
    .all() as Omit<EmergencyAlert, "ride">[];
  return rows.map((r) => ({ ...r, ride: r.rideId ? getRide(r.rideId) : null }));
}

export function handleAlert(id: number, admin: User, note: unknown) {
  const res = db
    .prepare("UPDATE emergency_alerts SET handled_at = ?, handled_by = ?, note = ? WHERE id = ? AND handled_at IS NULL")
    .run(new Date().toISOString(), admin.name, String(note ?? "").trim().slice(0, 1000) || null, id);
  if (res.changes === 0) throw new HttpError(409, "Alerte introuvable ou déjà traitée.");
  publish("admins", { type: "alert" });
}
