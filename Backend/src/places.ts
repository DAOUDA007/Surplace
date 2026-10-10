import { db } from "./db";
import { HttpError } from "./http";
import type { AdminPlace, Place, SavedPlace } from "./types";
import { requiredText } from "./validation";

function coords(lat: unknown, lng: unknown) {
  const la = Number(lat);
  const lo = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) {
    throw new HttpError(400, "Position invalide.");
  }
  return { lat: la, lng: lo };
}

// --- Lieux fréquents de Korhogo (gérés par l'administration, proposés à tous) ---

export function listPublicPlaces(): Place[] {
  return db.prepare("SELECT label, lat, lng FROM places WHERE active = 1 ORDER BY sort, id").all() as Place[];
}

export function listAdminPlaces(): AdminPlace[] {
  return db.prepare("SELECT id, label, lat, lng, active, sort FROM places ORDER BY sort, id").all() as AdminPlace[];
}

export function savePlace(body: Record<string, unknown>, id?: number) {
  const label = requiredText(body.label, "Nom du lieu", 120);
  const { lat, lng } = coords(body.lat, body.lng);
  const active = body.active === false ? 0 : 1;
  const sort = Number.isInteger(body.sort) ? Number(body.sort) : 0;
  if (id) {
    const res = db.prepare("UPDATE places SET label = ?, lat = ?, lng = ?, active = ?, sort = ? WHERE id = ?").run(label, lat, lng, active, sort, id);
    if (res.changes === 0) throw new HttpError(404, "Lieu introuvable.");
    return id;
  }
  const max = (db.prepare("SELECT COALESCE(MAX(sort), 0) AS n FROM places").get() as { n: number }).n;
  return Number(db.prepare("INSERT INTO places (label, lat, lng, active, sort) VALUES (?, ?, ?, ?, ?)").run(label, lat, lng, active, max + 1).lastInsertRowid);
}

export function deletePlace(id: number) {
  const res = db.prepare("DELETE FROM places WHERE id = ?").run(id);
  if (res.changes === 0) throw new HttpError(404, "Lieu introuvable.");
}

// --- Lieux favoris d'un passager (Maison, Travail, autres) ---

export function listSavedPlaces(userId: number): SavedPlace[] {
  return db
    .prepare("SELECT id, kind, label, lat, lng FROM saved_places WHERE user_id = ? ORDER BY CASE kind WHEN 'home' THEN 0 WHEN 'work' THEN 1 ELSE 2 END, id")
    .all(userId) as SavedPlace[];
}

/** Maison et Travail sont uniques : en enregistrer un nouveau remplace l'ancien. */
export function addSavedPlace(userId: number, body: Record<string, unknown>) {
  const kind = body.kind === "home" || body.kind === "work" ? body.kind : "other";
  const label = requiredText(body.label, "Nom du lieu", 200);
  const { lat, lng } = coords(body.lat, body.lng);
  const count = (db.prepare("SELECT COUNT(*) AS n FROM saved_places WHERE user_id = ?").get(userId) as { n: number }).n;
  if (count >= 20) throw new HttpError(400, "20 lieux favoris au maximum.");
  db.transaction(() => {
    if (kind !== "other") db.prepare("DELETE FROM saved_places WHERE user_id = ? AND kind = ?").run(userId, kind);
    db.prepare("INSERT INTO saved_places (user_id, kind, label, lat, lng, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      userId,
      kind,
      label,
      lat,
      lng,
      new Date().toISOString(),
    );
  })();
  return listSavedPlaces(userId);
}

export function deleteSavedPlace(userId: number, id: number) {
  db.prepare("DELETE FROM saved_places WHERE id = ? AND user_id = ?").run(id, userId);
  return listSavedPlaces(userId);
}

/** Dernières destinations distinctes du passager (raccourcis sous le champ « Destination »). */
export function recentDestinations(userId: number): Place[] {
  return db
    .prepare(
      `SELECT dropoff_label AS label, dropoff_lat AS lat, dropoff_lng AS lng FROM rides
        WHERE passenger_id = ? AND status = 'completed'
        GROUP BY dropoff_label ORDER BY MAX(requested_at) DESC LIMIT 5`,
    )
    .all(userId) as Place[];
}
