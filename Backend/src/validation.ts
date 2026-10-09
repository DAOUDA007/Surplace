import { HttpError } from "./http";

/** Normalise un numéro ivoirien (10 chiffres) ; accepte le préfixe +225 / 00225. */
export function normalizePhone(input: unknown): string {
  const digits = String(input ?? "").replace(/[\s.\-()]/g, "").replace(/^(\+|00)225/, "");
  if (!/^0\d{9}$/.test(digits)) {
    throw new HttpError(400, "Numéro de téléphone invalide (10 chiffres, ex. 07 00 00 00 00).");
  }
  return digits;
}

/** E-mail facultatif : renvoie null si vide, lève une erreur s'il est mal formé. */
export function optionalEmail(input: unknown): string | null {
  const email = String(input ?? "").trim().toLowerCase();
  if (!email) return null;
  if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new HttpError(400, "Adresse e-mail invalide (ex. nom@exemple.com).");
  }
  return email;
}

export function validatePin(input: unknown): string {
  const pin = String(input ?? "");
  if (!/^\d{4}$/.test(pin)) throw new HttpError(400, "Le code PIN doit contenir 4 chiffres.");
  return pin;
}

export function requiredText(input: unknown, label: string, max = 80): string {
  const text = String(input ?? "").trim();
  if (!text) throw new HttpError(400, `${label} requis.`);
  return text.slice(0, max);
}

/** Numéro du permis de conduire d'un chauffeur (vérifié ensuite par l'équipe SURPLACE). */
export function validateLicense(input: unknown): string {
  const license = requiredText(input, "Numéro de permis de conduire", 30).toUpperCase();
  if (license.length < 5) throw new HttpError(400, "Numéro de permis de conduire trop court.");
  return license;
}

export function parseId(input: string): number {
  const id = Number(input);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Identifiant invalide.");
  return id;
}
