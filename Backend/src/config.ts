/** Réglages du serveur lus dans l'environnement (Backend/.env). */

/** Adresse publique de l'Application (site des passagers et chauffeurs), pour les liens dans les e-mails et SMS. */
export const SITE_URL = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Adresse publique de l'Administration, pour les liens envoyés à l'équipe. */
export const ADMIN_URL = (process.env.ADMIN_URL ?? "http://localhost:3001").replace(/\/$/, "");

export const IS_PRODUCTION = process.env.NODE_ENV === "production";
