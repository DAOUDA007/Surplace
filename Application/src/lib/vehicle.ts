// ⚠️ Fichier copié depuis Commun/lib/vehicle.ts par scripts/sync-commun.mjs : modifiez l'original dans Commun/.
/**
 * Formats officiels des pièces du chauffeur en Côte d'Ivoire.
 * Utilisé à la saisie (formulaires) et vérifié de nouveau par le serveur.
 */

/**
 * Plaque d'immatriculation, deux modèles en circulation :
 * - nouvelle plaque sécurisée (depuis juin 2023) : 2 lettres, 3 chiffres, 2 lettres, ex. AB-123-CD ;
 * - ancienne plaque : 1 à 4 chiffres, 1 ou 2 lettres, puis le code à 2 chiffres, ex. 1234 AB 01.
 */
const NEW_PLATE = /^([A-Z]{2})(\d{3})([A-Z]{2})$/;
const OLD_PLATE = /^(\d{1,4})([A-Z]{1,2})(\d{2})$/;

export const PLATE_HINT = "Nouvelle plaque : AB-123-CD. Ancienne plaque : 1234 AB 01.";

/** Plaque au format officiel (ex. « AB-123-CD » ou « 1234 AB 01 »), ou null si elle n'est pas conforme. */
export function normalizePlate(input: string): string | null {
  const compact = input.toUpperCase().replace(/[\s.\-_/]/g, "");
  const recent = NEW_PLATE.exec(compact);
  if (recent) return `${recent[1]}-${recent[2]}-${recent[3]}`;
  const old = OLD_PLATE.exec(compact);
  if (old) return `${old[1]} ${old[2]} ${old[3]}`;
  return null;
}

/**
 * Numéro du permis de conduire : lettres majuscules et chiffres, avec tirets, barres obliques
 * ou espaces comme séparateurs ; 5 à 30 caractères, au moins un chiffre.
 */
export const LICENSE_HINT = "Recopiez le numéro exactement comme sur votre permis : lettres, chiffres, tirets.";

export function normalizeLicense(input: string): string | null {
  const license = input.toUpperCase().trim().replace(/\s+/g, " ").replace(/\s*([-/])\s*/g, "$1");
  if (license.length < 5 || license.length > 30) return null;
  if (!/^[A-Z0-9](?:[A-Z0-9 \-/]*[A-Z0-9])?$/.test(license) || !/\d/.test(license)) return null;
  return license;
}

/** Ne garde que les caractères autorisés pendant la frappe (plaque et permis). */
export function keepPlateChars(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9 \-]/g, "");
}
