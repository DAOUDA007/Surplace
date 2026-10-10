import { db } from "./db";
import { HttpError } from "./http";
import { notifyUser } from "./notifications";
import { COMPLAINT_CATEGORIES, type AdminComplaint, type User } from "./types";
import { requiredText } from "./validation";

/** Réclamation d'un passager ou d'un chauffeur, rattachée (ou non) à une de ses courses. */
export function createComplaint(user: User, body: Record<string, unknown>) {
  const category = String(body.category ?? "");
  if (!COMPLAINT_CATEGORIES.includes(category)) throw new HttpError(400, "Choisissez le type de problème.");
  const message = requiredText(body.message, "Description", 2000);
  if (message.length < 10) throw new HttpError(400, "Décrivez le problème en quelques mots de plus.");
  let rideId: number | null = null;
  if (body.rideId != null) {
    rideId = Number(body.rideId);
    const ride = db.prepare("SELECT passenger_id, driver_id FROM rides WHERE id = ?").get(rideId) as
      | { passenger_id: number; driver_id: number | null }
      | undefined;
    if (!ride || (ride.passenger_id !== user.id && ride.driver_id !== user.id)) throw new HttpError(404, "Course introuvable.");
  }
  const open = (db.prepare("SELECT COUNT(*) AS n FROM complaints WHERE user_id = ? AND status = 'open'").get(user.id) as { n: number }).n;
  if (open >= 5) throw new HttpError(429, "Vous avez déjà 5 réclamations en cours de traitement.");
  db.prepare("INSERT INTO complaints (ride_id, user_id, category, message, created_at) VALUES (?, ?, ?, ?, ?)").run(
    rideId,
    user.id,
    category,
    message,
    new Date().toISOString(),
  );
}

export function listComplaints(status?: string): AdminComplaint[] {
  const where = status === "open" || status === "resolved" ? "WHERE c.status = ?" : "";
  return db
    .prepare(
      `SELECT c.id, c.ride_id AS rideId, c.category, c.message, c.status, c.admin_note AS adminNote,
              c.created_at AS createdAt, c.resolved_at AS resolvedAt,
              u.name AS author, u.role AS authorRole, COALESCE(u.guest_phone, u.phone) AS authorPhone
         FROM complaints c JOIN users u ON u.id = c.user_id ${where}
        ORDER BY CASE c.status WHEN 'open' THEN 0 ELSE 1 END, c.id DESC LIMIT 300`,
    )
    .all(...(where ? [status] : [])) as AdminComplaint[];
}

/** L'équipe traite la réclamation ; la personne reçoit la réponse dans ses notifications. */
export function resolveComplaint(id: number, note: unknown) {
  const row = db.prepare("SELECT user_id, category FROM complaints WHERE id = ?").get(id) as { user_id: number; category: string } | undefined;
  if (!row) throw new HttpError(404, "Réclamation introuvable.");
  const text = String(note ?? "").trim().slice(0, 1000) || null;
  db.prepare("UPDATE complaints SET status = 'resolved', admin_note = ?, resolved_at = ? WHERE id = ?").run(text, new Date().toISOString(), id);
  notifyUser(row.user_id, `Réclamation traitée : ${row.category}`, text ?? "L'équipe SURPLACE a traité votre réclamation.", {});
}

export function deleteComplaint(id: number) {
  const res = db.prepare("DELETE FROM complaints WHERE id = ?").run(id);
  if (res.changes === 0) throw new HttpError(404, "Réclamation introuvable.");
}
