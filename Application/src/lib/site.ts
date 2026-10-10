// ⚠️ Fichier copié depuis Commun/lib/site.ts par scripts/sync-commun.mjs : modifiez l'original dans Commun/.
/**
 * Coordonnées de SURPLACE : affichées sur la page d'accueil, dans les e-mails et sur l'écran d'urgence.
 * ⚠️ Vérifiez-les avant la mise en service.
 */
export const CONTACT = {
  phone: "+225 05 74 32 88 18",
  /** Numéro WhatsApp au format international, chiffres uniquement (pour le lien wa.me). */
  whatsapp: "2250574328818",
  email: "academypro61@gmail.com",
  address: "Cité Ali Kader, Korhogo, Côte d'Ivoire",
  hours: "Tous les jours, de 8 h à 20 h",
  /** Ligne d'urgence SURPLACE, appelée depuis le bouton 🆘 pendant une course. */
  emergencyPhone: "+225 05 74 32 88 18",
};

/** Numéros d'urgence publics en Côte d'Ivoire, proposés par le bouton 🆘. */
export const EMERGENCY_NUMBERS = [
  { label: "Police secours", phone: "110" },
  { label: "Police secours (2)", phone: "111" },
  { label: "Sapeurs-pompiers", phone: "180" },
  { label: "SAMU", phone: "185" },
];

export const CONTACT_SUBJECTS = [
  "Question sur une course",
  "Devenir chauffeur",
  "Réclamation",
  "Partenariat",
  "Autre",
];
