import { randomInt } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./http";
import { notifyUser } from "./notifications";
import { getSettings } from "./settings";
import { addSubscriptionDays } from "./subscriptions";

/**
 * Parrainage entre chauffeurs : chaque chauffeur a un code (ex. SP7K2Q). Un nouveau chauffeur qui le saisit
 * à l'inscription devient son filleul ; quand le filleul paie son PREMIER abonnement, le parrain reçoit des
 * jours d'abonnement offerts (réglage « referralDays »). Aucun argent n'est versé.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O ni 1/I, faciles à confondre

function newCode() {
  let code = "SP";
  for (let i = 0; i < 5; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** Code de parrainage du chauffeur (créé à la première demande). */
export function ensureReferralCode(driverId: number) {
  const row = db.prepare("SELECT referral_code FROM users WHERE id = ?").get(driverId) as { referral_code: string | null } | undefined;
  if (row?.referral_code) return row.referral_code;
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = newCode();
    try {
      db.prepare("UPDATE users SET referral_code = ? WHERE id = ?").run(code, driverId);
      return code;
    } catch {
      // Code déjà pris (index unique) : on en tire un autre.
    }
  }
  throw new HttpError(500, "Impossible de créer un code de parrainage.");
}

/** Trouve le parrain d'un code saisi à l'inscription (null si vide). */
export function findReferrer(input: unknown): number | null {
  const code = String(input ?? "").trim().toUpperCase();
  if (!code) return null;
  const row = db
    .prepare(
      "SELECT u.id FROM users u JOIN drivers d ON d.user_id = u.id WHERE u.referral_code = ? AND u.deleted_at IS NULL",
    )
    .get(code) as { id: number } | undefined;
  if (!row) throw new HttpError(400, "Code de parrainage inconnu.");
  return row.id;
}

/** Appelé quand un abonnement est payé : récompense le parrain une seule fois par filleul. */
export function rewardReferral(driverId: number) {
  const row = db.prepare("SELECT referred_by, referral_rewarded FROM drivers WHERE user_id = ?").get(driverId) as
    | { referred_by: number | null; referral_rewarded: number }
    | undefined;
  if (!row?.referred_by || row.referral_rewarded) return;
  const days = getSettings().referralDays;
  db.prepare("UPDATE drivers SET referral_rewarded = 1 WHERE user_id = ?").run(driverId);
  const referrer = db.prepare("SELECT 1 FROM drivers d JOIN users u ON u.id = d.user_id WHERE d.user_id = ? AND u.deleted_at IS NULL").get(row.referred_by);
  if (!referrer || days <= 0) return;
  const end = addSubscriptionDays(row.referred_by, days);
  const filleul = db.prepare("SELECT name FROM users WHERE id = ?").get(driverId) as { name: string };
  notifyUser(
    row.referred_by,
    `🎁 ${days} jours offerts`,
    `Merci d'avoir parrainé ${filleul.name}. Votre abonnement court maintenant jusqu'au ${end.toLocaleDateString("fr-FR")}.`,
    { url: "/chauffeur" },
  );
}

export function referralStats(driverId: number) {
  const counts = db
    .prepare("SELECT COUNT(*) AS count, COALESCE(SUM(referral_rewarded), 0) AS rewarded FROM drivers WHERE referred_by = ?")
    .get(driverId) as { count: number; rewarded: number };
  return { code: ensureReferralCode(driverId), ...counts, daysPerReferral: getSettings().referralDays };
}
