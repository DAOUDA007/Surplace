import { randomBytes } from "node:crypto";
import { db } from "./db";
import { publish, publishToUser } from "./events";
import { HttpError } from "./http";
import { hashPin, verifyPin } from "./password";
import type { User } from "./types";
import { normalizePhone, optionalEmail, requiredText, validatePin } from "./validation";

const ACTIVE_RIDE_SQL = "status IN ('requested', 'accepted', 'arrived', 'in_progress')";

function assertPhoneFree(phone: string, exceptUserId?: number) {
  const taken = db.prepare("SELECT id FROM users WHERE phone = ?").get(phone) as { id: number } | undefined;
  if (taken && taken.id !== exceptUserId) throw new HttpError(409, "Ce numéro est déjà utilisé par un autre compte.");
}

// --- Profil de l'utilisateur connecté ---

/**
 * Modifie le profil (nom, téléphone ; plaque et moto pour un chauffeur).
 * Un chauffeur qui change de véhicule repasse en validation : l'équipe doit le revérifier.
 */
export function updateProfile(user: User, body: Record<string, unknown>) {
  const name = requiredText(body.name, "Nom");
  const phone = normalizePhone(body.phone);
  const email = optionalEmail(body.email);
  assertPhoneFree(phone, user.id);

  let revalidation = false;
  db.transaction(() => {
    db.prepare("UPDATE users SET name = ?, phone = ?, email = ? WHERE id = ?").run(name, phone, email, user.id);

    if (user.role === "driver") {
      const plate = requiredText(body.plate, "Immatriculation", 20).toUpperCase();
      const motoModel = requiredText(body.motoModel, "Modèle de moto", 40);
      const current = db.prepare("SELECT plate, moto_model, status FROM drivers WHERE user_id = ?").get(user.id) as {
        plate: string;
        moto_model: string;
        status: string;
      };
      const vehicleChanged = current.plate !== plate || current.moto_model !== motoModel;
      if (vehicleChanged) {
        const busy = db.prepare(`SELECT 1 FROM rides WHERE driver_id = ? AND ${ACTIVE_RIDE_SQL}`).get(user.id);
        if (busy) throw new HttpError(409, "Terminez votre course avant de modifier votre véhicule.");
        db.prepare("UPDATE drivers SET plate = ?, moto_model = ? WHERE user_id = ?").run(plate, motoModel, user.id);
        if (current.status === "approved") {
          db.prepare("UPDATE drivers SET status = 'pending', is_online = 0 WHERE user_id = ?").run(user.id);
          revalidation = true;
        }
      }
    }
  })();

  if (revalidation) {
    publishToUser(user.id, { type: "profile" });
    publish("drivers", { type: "available-rides" });
  }
  return { revalidation };
}

export function changePin(userId: number, currentPin: unknown, newPin: unknown) {
  const row = db.prepare("SELECT pin_hash FROM users WHERE id = ?").get(userId) as { pin_hash: string } | undefined;
  if (!row || !verifyPin(String(currentPin ?? ""), row.pin_hash)) {
    throw new HttpError(400, "Le code PIN actuel est incorrect.");
  }
  db.prepare("UPDATE users SET pin_hash = ? WHERE id = ?").run(hashPin(validatePin(newPin)), userId);
}

// --- Suppression de comptes passager / chauffeur ---

/**
 * Supprime un passager ou un chauffeur.
 * Sans historique de courses, le compte est effacé. Sinon il est anonymisé : nom et numéro
 * effacés, connexion impossible, mais les courses restent pour l'historique des autres utilisateurs.
 */
export function deleteMemberAccount(userId: number, role: "passenger" | "driver") {
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role = ? AND deleted_at IS NULL").get(userId, role);
  if (!user) throw new HttpError(404, role === "driver" ? "Chauffeur introuvable." : "Passager introuvable.");

  const column = role === "driver" ? "driver_id" : "passenger_id";
  const active = db.prepare(`SELECT 1 FROM rides WHERE ${column} = ? AND ${ACTIVE_RIDE_SQL}`).get(userId);
  if (active) throw new HttpError(409, "Ce compte a une course en cours : annulez-la d'abord depuis l'écran Courses.");

  const hasRides = db.prepare(`SELECT 1 FROM rides WHERE ${column} = ?`).get(userId);
  db.transaction(() => {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    if (!hasRides) {
      db.prepare("DELETE FROM users WHERE id = ?").run(userId);
      return;
    }
    db.prepare(
      `UPDATE users SET name = ?, phone = ?, email = NULL, pin_hash = ?, blocked = 1, deleted_at = ? WHERE id = ?`,
    ).run(
      role === "driver" ? "Chauffeur supprimé" : "Passager supprimé",
      `supprime-${userId}`,
      hashPin(randomBytes(8).toString("hex")),
      new Date().toISOString(),
      userId,
    );
    if (role === "driver") {
      db.prepare(
        `UPDATE drivers SET status = 'suspended', is_online = 0, lat = NULL, lng = NULL,
                plate = '—', moto_model = '—', subscription_until = NULL WHERE user_id = ?`,
      ).run(userId);
      db.prepare("DELETE FROM subscriptions WHERE driver_id = ? AND status = 'pending'").run(userId);
    }
  })();
  if (role === "driver") publish("drivers", { type: "available-rides" });
  return { anonymized: !!hasRides };
}

// --- Administrateurs ---

export function requirePrincipal(user: User) {
  if (!user.isPrincipal) {
    throw new HttpError(403, "Seul l'administrateur principal peut gérer les administrateurs.");
  }
}

export function listAdmins() {
  return (
    db
      .prepare(
        `SELECT id, name, phone, created_at AS createdAt, blocked, is_principal AS isPrincipal
           FROM users WHERE role = 'admin' AND deleted_at IS NULL
          ORDER BY is_principal DESC, created_at ASC`,
      )
      .all() as { id: number; name: string; phone: string; createdAt: string; blocked: number; isPrincipal: number }[]
  ).map((a) => ({ ...a, blocked: a.blocked === 1, isPrincipal: a.isPrincipal === 1 }));
}

export function createAdmin(body: Record<string, unknown>) {
  const name = requiredText(body.name, "Nom");
  const phone = normalizePhone(body.phone);
  const pin = validatePin(body.pin);
  assertPhoneFree(phone);
  db.prepare("INSERT INTO users (role, name, phone, pin_hash, created_at) VALUES ('admin', ?, ?, ?, ?)").run(
    name,
    phone,
    hashPin(pin),
    new Date().toISOString(),
  );
}

function getOtherAdmin(principal: User, adminId: number) {
  if (adminId === principal.id) throw new HttpError(400, "Cette action ne peut pas s'appliquer à votre propre compte.");
  const admin = db
    .prepare("SELECT id, blocked FROM users WHERE id = ? AND role = 'admin' AND deleted_at IS NULL")
    .get(adminId) as { id: number; blocked: number } | undefined;
  if (!admin) throw new HttpError(404, "Administrateur introuvable.");
  return admin;
}

export function setAdminBlocked(principal: User, adminId: number, blocked: boolean) {
  getOtherAdmin(principal, adminId);
  db.prepare("UPDATE users SET blocked = ? WHERE id = ?").run(blocked ? 1 : 0, adminId);
  if (blocked) db.prepare("DELETE FROM sessions WHERE user_id = ?").run(adminId);
}

export function deleteAdmin(principal: User, adminId: number) {
  getOtherAdmin(principal, adminId);
  db.prepare("DELETE FROM users WHERE id = ?").run(adminId);
}

/** Cède le rôle d'administrateur principal : l'ancien principal reste administrateur. */
export function transferPrincipal(principal: User, adminId: number) {
  const target = getOtherAdmin(principal, adminId);
  if (target.blocked) throw new HttpError(400, "Réactivez d'abord cet administrateur.");
  db.transaction(() => {
    db.prepare("UPDATE users SET is_principal = 0 WHERE role = 'admin'").run();
    db.prepare("UPDATE users SET is_principal = 1 WHERE id = ?").run(adminId);
  })();
}
