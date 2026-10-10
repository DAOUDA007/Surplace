import { scheduleBackups } from "./backup";
import { db } from "./db";
import { startDispatchLoop } from "./dispatch";
import { notifyUser } from "./notifications";
import { purgeOtp } from "./otp";
import { DOCUMENT_LABELS, type DocumentType } from "./types";

const DAY = 86_400_000;

/**
 * Rappels automatiques :
 * - abonnement qui expire dans 3 jours, puis dans 1 jour (notification, push et SMS) ;
 * - permis ou assurance qui expire dans 30 jours (une fois par date d'expiration).
 */
export function runReminders() {
  const now = Date.now();
  const drivers = db
    .prepare(
      `SELECT d.user_id AS id, d.subscription_until AS until, d.reminder3_for, d.reminder1_for
         FROM drivers d JOIN users u ON u.id = d.user_id
        WHERE u.deleted_at IS NULL AND u.blocked = 0 AND d.status = 'approved'
          AND d.subscription_until > ? AND d.subscription_until < ?`,
    )
    .all(new Date(now).toISOString(), new Date(now + 3 * DAY).toISOString()) as {
    id: number;
    until: string;
    reminder3_for: string | null;
    reminder1_for: string | null;
  }[];
  for (const d of drivers) {
    const left = new Date(d.until).getTime() - now;
    const date = new Date(d.until).toLocaleDateString("fr-FR");
    if (left < DAY && d.reminder1_for !== d.until) {
      notifyUser(d.id, "Abonnement : dernier jour", `Votre abonnement expire le ${date}. Renouvelez-le pour continuer à recevoir des courses.`, {
        url: "/chauffeur",
        sms: true,
      });
      db.prepare("UPDATE drivers SET reminder1_for = ?, reminder3_for = ? WHERE user_id = ?").run(d.until, d.until, d.id);
    } else if (left >= DAY && d.reminder3_for !== d.until) {
      notifyUser(d.id, "Abonnement bientôt expiré", `Votre abonnement expire le ${date}. Pensez à le renouveler.`, {
        url: "/chauffeur",
        sms: true,
      });
      db.prepare("UPDATE drivers SET reminder3_for = ? WHERE user_id = ?").run(d.until, d.id);
    }
  }

  const documents = db
    .prepare(
      `SELECT dd.id, dd.driver_id, dd.type, dd.expires_at FROM driver_documents dd JOIN users u ON u.id = dd.driver_id
        WHERE u.deleted_at IS NULL AND dd.expires_at IS NOT NULL AND dd.expires_at < ?
          AND (dd.reminder_for IS NULL OR dd.reminder_for != dd.expires_at)`,
    )
    .all(new Date(now + 30 * DAY).toISOString()) as { id: number; driver_id: number; type: DocumentType; expires_at: string }[];
  for (const doc of documents) {
    const expired = new Date(doc.expires_at).getTime() < now;
    const label = DOCUMENT_LABELS[doc.type];
    notifyUser(
      doc.driver_id,
      expired ? `${label} expiré(e)` : `${label} : expiration proche`,
      expired
        ? `Envoyez la nouvelle version depuis « Mon profil » › Mes documents.`
        : `Votre document expire le ${new Date(doc.expires_at).toLocaleDateString("fr-FR")}. Pensez à le renouveler.`,
      { url: "/chauffeur/profil" },
    );
    db.prepare("UPDATE driver_documents SET reminder_for = expires_at WHERE id = ?").run(doc.id);
  }
}

/** Démarre toutes les tâches de fond du serveur. */
export function startJobs() {
  startDispatchLoop();
  scheduleBackups();
  const hourly = () => {
    try {
      runReminders();
      purgeOtp();
    } catch (err) {
      console.error("[rappels]", err);
    }
  };
  setTimeout(hourly, 60_000).unref();
  setInterval(hourly, 3600_000).unref();
}
