import { randomInt } from "node:crypto";
import { IS_PRODUCTION } from "./config";
import { db } from "./db";
import { HttpError } from "./http";
import { RateLimiter } from "./limits";
import { hashPin, verifyPin } from "./password";
import { sendSms, smsConfigured } from "./sms";

/**
 * Codes de vérification à 6 chiffres envoyés par SMS.
 *
 * Obligatoires quand un fournisseur SMS est configuré, et toujours en développement (le code est alors
 * renvoyé à l'écran sous le nom devCode, puisqu'aucun SMS ne part). En production SANS fournisseur SMS,
 * la vérification est désactivée : sinon personne ne pourrait s'inscrire.
 */
export const otpRequired = smsConfigured || !IS_PRODUCTION;

export type OtpPurpose = "register" | "guest" | "reset" | "phone";
export const OTP_PURPOSES: OtpPurpose[] = ["register", "guest", "reset", "phone"];

const CODE_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const byPhone = new RateLimiter(3, 15 * 60_000);
const byIp = new RateLimiter(10, 60 * 60_000);

const MESSAGES: Record<OtpPurpose, string> = {
  register: "votre code d'inscription",
  guest: "votre code de confirmation de commande",
  reset: "votre code pour choisir un nouveau code PIN",
  phone: "votre code pour confirmer votre nouveau numéro",
};

/** Envoie un code. Renvoie devCode en développement (aucun SMS réel). */
export async function requestOtp(phone: string, purpose: OtpPurpose, ip: string) {
  if (!otpRequired) return { sent: false, required: false };
  byPhone.check(phone, "Trop de codes demandés pour ce numéro. Réessayez dans {minutes} min.");
  byIp.check(ip, "Trop de codes demandés. Réessayez dans {minutes} min.");

  if (purpose === "register" && db.prepare("SELECT 1 FROM users WHERE phone = ?").get(phone)) {
    throw new HttpError(409, "Ce numéro a déjà un compte. Connectez-vous, ou utilisez « Code PIN oublié ».");
  }
  // PIN oublié : on ne révèle pas si le numéro a un compte ; simplement, aucun SMS ne part.
  if (purpose === "reset") {
    const exists = db.prepare("SELECT 1 FROM users WHERE phone = ? AND deleted_at IS NULL AND blocked = 0").get(phone);
    byPhone.hit(phone);
    byIp.hit(ip);
    if (!exists) return { sent: true, required: true };
  } else {
    byPhone.hit(phone);
    byIp.hit(ip);
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const now = new Date();
  db.transaction(() => {
    db.prepare("UPDATE otp_codes SET used_at = ? WHERE phone = ? AND purpose = ? AND used_at IS NULL").run(
      now.toISOString(),
      phone,
      purpose,
    );
    db.prepare(
      "INSERT INTO otp_codes (phone, purpose, code_hash, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    ).run(phone, purpose, hashPin(code), now.toISOString(), new Date(now.getTime() + CODE_MINUTES * 60_000).toISOString());
  })();

  await sendSms(
    phone,
    `SURPLACE : ${code} est ${MESSAGES[purpose]}. Valable ${CODE_MINUTES} minutes. Ne le communiquez à personne.`,
  );
  return { sent: true, required: true, ...(smsConfigured ? {} : { devCode: code }) };
}

/** Vérifie et consomme un code. Ne fait rien si la vérification par SMS est désactivée. */
export function verifyOtp(phone: string, purpose: OtpPurpose, code: unknown) {
  if (!otpRequired) return;
  const value = String(code ?? "").replace(/\D/g, "");
  if (!value) throw new HttpError(400, "Entrez le code reçu par SMS.");
  const row = db
    .prepare(
      `SELECT id, code_hash, attempts FROM otp_codes
        WHERE phone = ? AND purpose = ? AND used_at IS NULL AND expires_at > ?
        ORDER BY id DESC LIMIT 1`,
    )
    .get(phone, purpose, new Date().toISOString()) as { id: number; code_hash: string; attempts: number } | undefined;
  if (!row) throw new HttpError(400, "Code expiré ou introuvable. Demandez un nouveau code.");
  if (row.attempts >= MAX_ATTEMPTS) throw new HttpError(429, "Trop d'essais. Demandez un nouveau code.");
  if (!verifyPin(value, row.code_hash)) {
    db.prepare("UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?").run(row.id);
    throw new HttpError(400, "Code incorrect.");
  }
  db.prepare("UPDATE otp_codes SET used_at = ? WHERE id = ?").run(new Date().toISOString(), row.id);
}

/** Ménage : suppression des codes de plus d'un jour. */
export function purgeOtp() {
  db.prepare("DELETE FROM otp_codes WHERE created_at < ?").run(new Date(Date.now() - 86_400_000).toISOString());
}
