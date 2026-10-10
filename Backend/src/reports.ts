import { db } from "./db";
import { HttpError } from "./http";
import { demandCells } from "./stats";
import type { MonthlyReport } from "./types";

/** Rapport d'un mois (« 2026-10 ») : courses, revenus, chauffeurs, heures de pointe, zones demandées. */
export function monthlyReport(monthInput: unknown): MonthlyReport {
  const month = String(monthInput ?? "") || new Date().toISOString().slice(0, 7);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, "Mois invalide (format AAAA-MM).");
  const [y, m] = month.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const to = new Date(Date.UTC(y, m, 1)).toISOString();
  const one = <T>(sql: string, ...params: unknown[]) => db.prepare(sql).get(...params) as T;

  const rides = one<{ total: number; completed: number; cancelled: number; scheduled: number }>(
    `SELECT COUNT(*) AS total,
            COALESCE(SUM(status = 'completed'), 0) AS completed,
            COALESCE(SUM(status = 'cancelled'), 0) AS cancelled,
            COALESCE(SUM(scheduled_at IS NOT NULL), 0) AS scheduled
       FROM rides WHERE requested_at >= ? AND requested_at < ?`,
    from,
    to,
  );
  const ridesRevenue = one<{ n: number }>(
    "SELECT COALESCE(SUM(price), 0) AS n FROM rides WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?",
    from,
    to,
  ).n;
  const subscriptionsRevenue = one<{ n: number }>(
    "SELECT COALESCE(SUM(amount), 0) AS n FROM subscriptions WHERE status = 'paid' AND paid_at >= ? AND paid_at < ?",
    from,
    to,
  ).n;
  const newPassengers = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'passenger' AND created_at >= ? AND created_at < ?",
    from,
    to,
  ).n;
  const newDrivers = one<{ n: number }>(
    "SELECT COUNT(*) AS n FROM users WHERE role = 'driver' AND created_at >= ? AND created_at < ?",
    from,
    to,
  ).n;
  const activeDrivers = one<{ n: number }>(
    "SELECT COUNT(DISTINCT driver_id) AS n FROM rides WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?",
    from,
    to,
  ).n;
  const avg = one<{ rating: number | null; distance: number | null }>(
    "SELECT AVG(rating) AS rating, AVG(distance_km) AS distance FROM rides WHERE status = 'completed' AND completed_at >= ? AND completed_at < ?",
    from,
    to,
  );

  const days: MonthlyReport["days"] = [];
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const day = `${month}-${String(d).padStart(2, "0")}`;
    days.push({
      day,
      ...one<{ completed: number; cancelled: number }>(
        `SELECT COALESCE(SUM(status = 'completed'), 0) AS completed, COALESCE(SUM(status = 'cancelled'), 0) AS cancelled
           FROM rides WHERE substr(requested_at, 1, 10) = ?`,
        day,
      ),
    });
  }

  const hours = Array.from({ length: 24 }, () => 0);
  for (const r of db.prepare("SELECT requested_at FROM rides WHERE requested_at >= ? AND requested_at < ?").all(from, to) as {
    requested_at: string;
  }[]) {
    hours[new Date(r.requested_at).getUTCHours()]++;
  }

  const topDrivers = db
    .prepare(
      `SELECT u.name, COUNT(*) AS rides, SUM(r.price) AS earnings,
              CASE WHEN d.rating_count > 0 THEN ROUND(1.0 * d.rating_sum / d.rating_count, 1) END AS rating
         FROM rides r JOIN users u ON u.id = r.driver_id JOIN drivers d ON d.user_id = r.driver_id
        WHERE r.status = 'completed' AND r.completed_at >= ? AND r.completed_at < ?
        GROUP BY r.driver_id ORDER BY rides DESC LIMIT 10`,
    )
    .all(from, to) as MonthlyReport["topDrivers"];

  return {
    month,
    rides: { ...rides, cancelRate: rides.total ? Math.round((rides.cancelled / rides.total) * 100) : 0 },
    ridesRevenue,
    subscriptionsRevenue,
    newPassengers,
    newDrivers,
    activeDrivers,
    averageRating: avg.rating != null ? Math.round(avg.rating * 10) / 10 : null,
    averageDistanceKm: avg.distance != null ? Math.round(avg.distance * 10) / 10 : null,
    days,
    hours,
    topDrivers,
    demand: demandCells(Math.ceil((Date.now() - new Date(from).getTime()) / 86_400_000)),
  };
}

// --- Exports pour Excel (CSV, séparateur « ; » et encodage UTF-8 avec BOM, comme Excel en français l'attend) ---

function csv(headers: string[], rows: unknown[][]) {
  const cell = (v: unknown) => {
    const text = v == null ? "" : String(v);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return "﻿" + [headers, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}

const EXPORTS: Record<string, { filename: string; build: (from: string, to: string) => string }> = {
  courses: {
    filename: "courses",
    build: (from, to) => {
      const rows = db
        .prepare(
          `SELECT r.id, r.requested_at, r.scheduled_at, r.status, p.name, COALESCE(p.guest_phone, p.phone), d.name, d.phone,
                  r.pickup_label, r.dropoff_label, r.distance_km, r.price, r.completed_at, r.cancelled_by, r.rating, r.comment
             FROM rides r JOIN users p ON p.id = r.passenger_id LEFT JOIN users d ON d.id = r.driver_id
            WHERE r.requested_at >= ? AND r.requested_at < ? ORDER BY r.id`,
        )
        .raw()
        .all(from, to) as unknown[][];
      return csv(
        ["N°", "Demandée le", "Réservée pour", "Statut", "Passager", "Tél. passager", "Chauffeur", "Tél. chauffeur", "Départ", "Arrivée", "Distance (km)", "Prix (FCFA)", "Terminée le", "Annulée par", "Note", "Commentaire"],
        rows,
      );
    },
  },
  abonnements: {
    filename: "abonnements",
    build: (from, to) => {
      const rows = db
        .prepare(
          `SELECT s.id, u.name, u.phone, s.plan, s.amount, s.status, s.requested_at, s.paid_at, s.starts_at, s.ends_at
             FROM subscriptions s JOIN users u ON u.id = s.driver_id
            WHERE s.requested_at >= ? AND s.requested_at < ? ORDER BY s.id`,
        )
        .raw()
        .all(from, to) as unknown[][];
      return csv(["N°", "Chauffeur", "Téléphone", "Formule", "Montant (FCFA)", "Statut", "Demandé le", "Payé le", "Début", "Fin"], rows);
    },
  },
  chauffeurs: {
    filename: "chauffeurs",
    build: () => {
      const rows = db
        .prepare(
          `SELECT u.id, u.name, u.phone, u.email, u.created_at, d.plate, d.moto_model, d.license_number, d.status,
                  d.subscription_until,
                  CASE WHEN d.rating_count > 0 THEN ROUND(1.0 * d.rating_sum / d.rating_count, 1) END,
                  (SELECT COUNT(*) FROM rides r WHERE r.driver_id = u.id AND r.status = 'completed'),
                  (SELECT COALESCE(SUM(price), 0) FROM rides r WHERE r.driver_id = u.id AND r.status = 'completed')
             FROM drivers d JOIN users u ON u.id = d.user_id WHERE u.deleted_at IS NULL ORDER BY u.id`,
        )
        .raw()
        .all() as unknown[][];
      return csv(
        ["N°", "Nom", "Téléphone", "E-mail", "Inscrit le", "Plaque", "Moto", "Permis", "Statut", "Abonné jusqu'au", "Note", "Courses", "Gains (FCFA)"],
        rows,
      );
    },
  },
  passagers: {
    filename: "passagers",
    build: () => {
      const rows = db
        .prepare(
          `SELECT u.id, u.name, COALESCE(u.guest_phone, u.phone), u.email, u.created_at,
                  CASE WHEN u.guest = 1 THEN 'oui' ELSE 'non' END, CASE WHEN u.blocked = 1 THEN 'oui' ELSE 'non' END,
                  (SELECT COUNT(*) FROM rides r WHERE r.passenger_id = u.id AND r.status = 'completed'),
                  (SELECT COALESCE(SUM(price), 0) FROM rides r WHERE r.passenger_id = u.id AND r.status = 'completed')
             FROM users u WHERE u.role = 'passenger' AND u.deleted_at IS NULL ORDER BY u.id`,
        )
        .raw()
        .all() as unknown[][];
      return csv(["N°", "Nom", "Téléphone", "E-mail", "Inscrit le", "Invité", "Bloqué", "Courses", "Dépensé (FCFA)"], rows);
    },
  },
  reclamations: {
    filename: "reclamations",
    build: (from, to) => {
      const rows = db
        .prepare(
          `SELECT c.id, c.created_at, u.name, u.role, c.ride_id, c.category, c.message, c.status, c.admin_note, c.resolved_at
             FROM complaints c JOIN users u ON u.id = c.user_id WHERE c.created_at >= ? AND c.created_at < ? ORDER BY c.id`,
        )
        .raw()
        .all(from, to) as unknown[][];
      return csv(["N°", "Date", "Auteur", "Rôle", "Course", "Type", "Message", "Statut", "Réponse", "Traitée le"], rows);
    },
  },
};

export const EXPORT_KINDS = Object.keys(EXPORTS);

/** Fichier CSV d'un export ; `month` (AAAA-MM) limite les courses, abonnements et réclamations à ce mois. */
export function buildExport(kind: string, monthInput: unknown) {
  const exp = EXPORTS[kind];
  if (!exp) throw new HttpError(404, "Export inconnu.");
  let from = "0000";
  let to = "9999";
  const month = String(monthInput ?? "");
  if (month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new HttpError(400, "Mois invalide (format AAAA-MM).");
    const [y, m] = month.split("-").map(Number);
    from = new Date(Date.UTC(y, m - 1, 1)).toISOString();
    to = new Date(Date.UTC(y, m, 1)).toISOString();
  }
  return { filename: `surplace-${exp.filename}${month ? `-${month}` : ""}.csv`, content: exp.build(from, to) };
}
