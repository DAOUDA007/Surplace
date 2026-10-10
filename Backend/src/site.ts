// Copie partagée avec Application/src/lib/site.ts : garder les coordonnées identiques.
/**
 * Coordonnées affichées dans les e-mails.
 * ⚠️ Valeurs PROVISOIRES : remplacez-les par les vraies coordonnées de SURPLACE.
 */
export const CONTACT = {
  phone: "+225 07 00 00 00 00",
  /** Numéro WhatsApp au format international, chiffres uniquement (pour le lien wa.me). */
  whatsapp: "2250700000000",
  email: "contact@surplace.ci",
  address: "Quartier Résidentiel, Korhogo, Côte d'Ivoire",
  hours: "Tous les jours, de 6 h à 22 h",
};

/** Adresse publique du site, utilisée pour les liens dans les e-mails. */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
