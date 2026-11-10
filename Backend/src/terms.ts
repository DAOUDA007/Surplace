import { db } from "./db";
import { HttpError } from "./http";
import { TERMS_VERSION } from "./site";
import type { User } from "./types";

/**
 * Conditions d'utilisation et politique de confidentialité (pages /conditions et /confidentialite de l'Application).
 *
 * Chaque passager et chauffeur doit les accepter : à l'inscription, à la commande sans compte, ou à sa prochaine
 * visite s'il s'est inscrit avant. Quand le texte change, TERMS_VERSION (Commun/lib/site.ts) change aussi et
 * tout le monde doit accepter la nouvelle version.
 */

const REQUIRED = "Pour continuer, acceptez les conditions d'utilisation et la politique de confidentialité.";

/** Formulaire d'inscription ou de commande sans compte : la case doit être cochée. */
export function assertTermsChecked(body: Record<string, unknown> | undefined) {
  if (body?.acceptTerms !== true) throw new HttpError(400, REQUIRED);
}

/** Enregistre l'acceptation de la version en vigueur (date et version, pour pouvoir le prouver). */
export function recordTermsAcceptance(userId: number) {
  db.prepare("UPDATE users SET terms_version = ?, terms_accepted_at = ? WHERE id = ?").run(
    TERMS_VERSION,
    new Date().toISOString(),
    userId,
  );
}

/** Commander, passer en ligne ou prendre une course : réservé à qui a accepté la version en vigueur. */
export function requireTerms(user: User) {
  if (user.role !== "admin" && !user.termsAccepted) throw new HttpError(403, REQUIRED);
}
