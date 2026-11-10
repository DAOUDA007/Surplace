// ⚠️ Fichier copié depuis Commun/lib/site.ts par scripts/sync-commun.mjs : modifiez l'original dans Commun/.
/**
 * Coordonnées de SURPLACE : affichées sur la page d'accueil, dans les e-mails et sur l'écran d'urgence.
 * Vérifiez-les avant la mise en service.
 */
export const CONTACT = {
  phone: "+225 05 74 32 88 18",
  /** Numéro WhatsApp au format international, chiffres uniquement (pour le lien wa.me). */
  whatsapp: "2250574328818",
  email: "academypro61@gmail.com",
  address: "Cité Ali Kader, Korhogo, Côte d'Ivoire",
  hours: "Tous les jours, de 8 h à 20 h",
  /** Ligne d'urgence SURPLACE, appelée depuis le bouton Urgence pendant une course. */
  emergencyPhone: "+225 05 74 32 88 18",
};

/**
 * Identité de l'éditeur, affichée dans les conditions d'utilisation et la politique de confidentialité.
 * À compléter avant la mise en service : les valeurs entre crochets s'affichent telles quelles sur le site.
 */
export const LEGAL = {
  /** Nom de l'entreprise ou de la personne qui exploite SURPLACE. */
  publisher: "[Raison sociale ou nom de l'exploitant]",
  /** Forme juridique et numéro d'immatriculation, ex. « SARL au capital de 1 000 000 FCFA, RCCM CI-KRG-2026-B-00000 ». */
  registration: "[Forme juridique et numéro RCCM]",
  /** Personne responsable du service et des données. */
  director: "[Nom du responsable]",
  /** Numéro de déclaration ou d'autorisation auprès de l'ARTCI (protection des données personnelles). */
  artci: "[Numéro de déclaration ARTCI]",
};

/**
 * Version des conditions d'utilisation et de la politique de confidentialité (date de la dernière modification).
 * À changer à chaque modification du texte : chaque utilisateur devra accepter la nouvelle version.
 */
export const TERMS_VERSION = "2026-11-10";

/** Numéros d'urgence publics en Côte d'Ivoire, proposés par le bouton Urgence. */
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
