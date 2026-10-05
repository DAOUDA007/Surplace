import { db } from "./db";
import { HttpError } from "./http";
import { requiredText } from "./validation";

export interface PublicReview {
  id: number;
  rating: number;
  comment: string;
  author: string;
  date: string;
}

/** "Awa Koné" → "Awa K." : on n'affiche jamais le nom complet publiquement. */
function shortName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last.charAt(0).toUpperCase()}.` : first;
}

/** Note moyenne, répartition des notes et derniers avis publiés, pour la page d'accueil. */
export function getPublicReviews() {
  const stats = db
    .prepare("SELECT COUNT(*) AS count, AVG(rating) AS average FROM rides WHERE rating IS NOT NULL")
    .get() as { count: number; average: number | null };
  const rows = db
    .prepare("SELECT rating, COUNT(*) AS n FROM rides WHERE rating IS NOT NULL GROUP BY rating")
    .all() as { rating: number; n: number }[];
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of rows) distribution[r.rating] = r.n;

  const reviews = (
    db
      .prepare(
        `SELECT r.id, r.rating, r.comment, r.completed_at AS date, u.name
           FROM rides r JOIN users u ON u.id = r.passenger_id
          WHERE r.rating IS NOT NULL AND r.comment IS NOT NULL AND r.review_hidden = 0
          ORDER BY r.completed_at DESC LIMIT 6`,
      )
      .all() as { id: number; rating: number; comment: string; date: string; name: string }[]
  ).map(({ name, ...r }) => ({ ...r, author: shortName(name) }));

  return {
    count: stats.count,
    average: stats.average != null ? Math.round(stats.average * 10) / 10 : null,
    distribution,
    reviews: reviews as PublicReview[],
  };
}

// Limite simple contre le spam : 3 messages par adresse IP toutes les 10 minutes.
const recentByIp = new Map<string, number[]>();

export function createContactMessage(ip: string, body: Record<string, unknown>) {
  const now = Date.now();
  const recent = (recentByIp.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  if (recent.length >= 3) {
    throw new HttpError(429, "Trop de messages envoyés. Réessayez dans quelques minutes.");
  }

  const name = requiredText(body.name, "Nom", 80);
  const phone = requiredText(body.phone, "Téléphone ou e-mail", 120);
  const subject = requiredText(body.subject, "Sujet", 120);
  const message = requiredText(body.message, "Message", 2000);
  if (message.length < 10) throw new HttpError(400, "Votre message est trop court.");

  db.prepare(
    "INSERT INTO contact_messages (name, phone, subject, message, created_at) VALUES (?, ?, ?, ?, ?)",
  ).run(name, phone, subject, message, new Date().toISOString());
  recentByIp.set(ip, [...recent, now]);
}

export function listContactMessages() {
  return db
    .prepare(
      `SELECT id, name, phone, subject, message, created_at AS createdAt, handled
         FROM contact_messages ORDER BY handled ASC, created_at DESC LIMIT 100`,
    )
    .all() as {
    id: number;
    name: string;
    phone: string;
    subject: string;
    message: string;
    createdAt: string;
    handled: number;
  }[];
}

export function setMessageHandled(id: number, handled: boolean) {
  const res = db.prepare("UPDATE contact_messages SET handled = ? WHERE id = ?").run(handled ? 1 : 0, id);
  if (res.changes === 0) throw new HttpError(404, "Message introuvable.");
}

export function setReviewHidden(rideId: number, hidden: boolean) {
  const res = db
    .prepare("UPDATE rides SET review_hidden = ? WHERE id = ? AND rating IS NOT NULL")
    .run(hidden ? 1 : 0, rideId);
  if (res.changes === 0) throw new HttpError(404, "Avis introuvable.");
}

/** Avis avec commentaire, pour la modération dans le tableau de bord. */
export function listReviewsForAdmin() {
  return db
    .prepare(
      `SELECT r.id, r.rating, r.comment, r.completed_at AS date, r.review_hidden AS hidden,
              p.name AS passenger, d.name AS driver
         FROM rides r JOIN users p ON p.id = r.passenger_id LEFT JOIN users d ON d.id = r.driver_id
        WHERE r.rating IS NOT NULL AND r.comment IS NOT NULL
        ORDER BY r.completed_at DESC LIMIT 50`,
    )
    .all() as {
    id: number;
    rating: number;
    comment: string;
    date: string;
    hidden: number;
    passenger: string;
    driver: string | null;
  }[];
}
