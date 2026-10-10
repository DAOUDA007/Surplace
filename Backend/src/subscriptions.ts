import { db } from "./db";
import { publishToUser } from "./events";
import { HttpError } from "./http";
import { notifyUser } from "./notifications";
import { SUBSCRIPTION_PLANS, type SubscriptionPlan } from "./pricing";
import { rewardReferral } from "./referrals";
import { getSettings } from "./settings";

export interface SubscriptionRecord {
  id: number;
  driverId: number;
  plan: SubscriptionPlan;
  amount: number;
  status: "pending" | "paid" | "rejected" | "cancelled";
  requestedAt: string;
  paidAt: string | null;
  startsAt: string | null;
  endsAt: string | null;
}

const SELECT = `SELECT id, driver_id AS driverId, plan, amount, status, requested_at AS requestedAt,
                       paid_at AS paidAt, starts_at AS startsAt, ends_at AS endsAt
                  FROM subscriptions`;

export function isPlan(value: unknown): value is SubscriptionPlan {
  return typeof value === "string" && value in SUBSCRIPTION_PLANS;
}

export function isSubscriptionActive(until: string | null | undefined) {
  return !!until && new Date(until).getTime() > Date.now();
}

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function getUntil(driverId: number) {
  const row = db.prepare("SELECT subscription_until AS until FROM drivers WHERE user_id = ?").get(driverId) as
    | { until: string | null }
    | undefined;
  if (!row) throw new HttpError(404, "Chauffeur introuvable.");
  return row.until;
}

/**
 * Prolonge l'abonnement : la nouvelle période commence à la fin de l'abonnement en cours
 * (ou maintenant s'il est expiré), pour que le chauffeur ne perde aucun jour.
 */
function extend(subscriptionId: number, driverId: number, plan: SubscriptionPlan) {
  const until = getUntil(driverId);
  const start = isSubscriptionActive(until) ? new Date(until!) : new Date();
  const end = addMonths(start, SUBSCRIPTION_PLANS[plan].months);
  const now = new Date().toISOString();
  db.prepare(
    "UPDATE subscriptions SET status = 'paid', paid_at = ?, starts_at = ?, ends_at = ? WHERE id = ?",
  ).run(now, start.toISOString(), end.toISOString(), subscriptionId);
  db.prepare("UPDATE drivers SET subscription_until = ? WHERE user_id = ?").run(end.toISOString(), driverId);
  publishToUser(driverId, { type: "profile" });
  notifyUser(driverId, "Abonnement activé ✅", `Votre abonnement est valable jusqu'au ${end.toLocaleDateString("fr-FR")}.`, {
    url: "/chauffeur",
  });
  // Premier abonnement payé d'un chauffeur parrainé : son parrain reçoit des jours offerts.
  rewardReferral(driverId);
}

/** Ajoute des jours d'abonnement offerts (parrainage), à partir de la fin de l'abonnement en cours. */
export function addSubscriptionDays(driverId: number, days: number) {
  const until = getUntil(driverId);
  const start = isSubscriptionActive(until) ? new Date(until!) : new Date();
  const end = new Date(start.getTime() + days * 86_400_000);
  db.prepare("UPDATE drivers SET subscription_until = ? WHERE user_id = ?").run(end.toISOString(), driverId);
  publishToUser(driverId, { type: "profile" });
  return end;
}

/** Prix actuel d'une formule (réglable dans l'administration). */
export const planPrice = (plan: SubscriptionPlan) => getSettings().plans[plan];

/** Abonnement du chauffeur : état actuel, demande en attente et historique des paiements. */
export function getDriverSubscription(driverId: number) {
  const until = getUntil(driverId);
  const history = db.prepare(`${SELECT} WHERE driver_id = ? ORDER BY requested_at DESC LIMIT 24`).all(driverId) as SubscriptionRecord[];
  return {
    until,
    active: isSubscriptionActive(until),
    daysLeft: until ? Math.max(0, Math.ceil((new Date(until).getTime() - Date.now()) / 86_400_000)) : 0,
    pending: history.find((s) => s.status === "pending") ?? null,
    history: history.filter((s) => s.status === "paid"),
    prices: { ...getSettings().plans },
  };
}

/** Le chauffeur choisit une formule ; l'abonnement s'active quand l'admin confirme le paiement. */
export function requestSubscription(driverId: number, plan: unknown) {
  if (!isPlan(plan)) throw new HttpError(400, "Formule d'abonnement inconnue.");
  const pending = db
    .prepare("SELECT 1 FROM subscriptions WHERE driver_id = ? AND status = 'pending'")
    .get(driverId);
  if (pending) throw new HttpError(409, "Vous avez déjà une demande d'abonnement en attente.");
  db.prepare(
    "INSERT INTO subscriptions (driver_id, plan, amount, status, requested_at) VALUES (?, ?, ?, 'pending', ?)",
  ).run(driverId, plan, planPrice(plan), new Date().toISOString());
  return getDriverSubscription(driverId);
}

export function cancelSubscriptionRequest(driverId: number) {
  db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE driver_id = ? AND status = 'pending'").run(
    driverId,
  );
  return getDriverSubscription(driverId);
}

/** L'admin confirme avoir reçu le paiement d'une demande, ou la refuse. */
export function reviewSubscriptionRequest(subscriptionId: number, approve: boolean) {
  const sub = db.prepare(`${SELECT} WHERE id = ?`).get(subscriptionId) as SubscriptionRecord | undefined;
  if (!sub) throw new HttpError(404, "Demande introuvable.");
  if (sub.status !== "pending") throw new HttpError(409, "Cette demande a déjà été traitée.");
  if (approve) {
    db.transaction(() => extend(sub.id, sub.driverId, sub.plan))();
  } else {
    db.prepare("UPDATE subscriptions SET status = 'rejected' WHERE id = ?").run(sub.id);
    publishToUser(sub.driverId, { type: "profile" });
    notifyUser(sub.driverId, "Demande d'abonnement refusée", "Contactez SURPLACE pour plus d'informations.", {
      url: "/chauffeur",
    });
  }
}

/** L'admin enregistre directement un paiement reçu (sans demande préalable du chauffeur). */
export function recordSubscriptionPayment(driverId: number, plan: unknown) {
  if (!isPlan(plan)) throw new HttpError(400, "Formule d'abonnement inconnue.");
  getUntil(driverId);
  db.transaction(() => {
    // Une éventuelle demande en attente est remplacée par ce paiement.
    db.prepare("UPDATE subscriptions SET status = 'cancelled' WHERE driver_id = ? AND status = 'pending'").run(
      driverId,
    );
    const res = db
      .prepare(
        "INSERT INTO subscriptions (driver_id, plan, amount, status, requested_at) VALUES (?, ?, ?, 'pending', ?)",
      )
      .run(driverId, plan, planPrice(plan), new Date().toISOString());
    extend(Number(res.lastInsertRowid), driverId, plan);
  })();
}

/**
 * Supprime une demande ou un paiement d'abonnement (erreur de saisie, fraude…).
 * Supprimer un paiement retire sa durée de l'abonnement du chauffeur.
 */
export function deleteSubscription(subscriptionId: number) {
  const sub = db.prepare(`${SELECT} WHERE id = ?`).get(subscriptionId) as SubscriptionRecord | undefined;
  if (!sub) throw new HttpError(404, "Abonnement introuvable.");
  db.transaction(() => {
    if (sub.status === "paid") {
      const until = getUntil(sub.driverId);
      if (until) {
        const reduced = addMonths(new Date(until), -SUBSCRIPTION_PLANS[sub.plan].months);
        db.prepare("UPDATE drivers SET subscription_until = ? WHERE user_id = ?").run(reduced.toISOString(), sub.driverId);
      }
    }
    db.prepare("DELETE FROM subscriptions WHERE id = ?").run(subscriptionId);
  })();
  enforceSubscription(sub.driverId);
  publishToUser(sub.driverId, { type: "profile" });
}

/** Un chauffeur dont l'abonnement a expiré est mis hors ligne (sauf s'il termine une course). */
export function enforceSubscription(driverId: number) {
  const row = db.prepare("SELECT is_online, subscription_until FROM drivers WHERE user_id = ?").get(driverId) as
    | { is_online: number; subscription_until: string | null }
    | undefined;
  if (!row?.is_online || isSubscriptionActive(row.subscription_until)) return;
  const busy = db
    .prepare("SELECT 1 FROM rides WHERE driver_id = ? AND status IN ('accepted', 'arrived', 'in_progress')")
    .get(driverId);
  if (!busy) {
    db.prepare("UPDATE drivers SET is_online = 0 WHERE user_id = ?").run(driverId);
    db.prepare("UPDATE driver_online_log SET ended_at = ? WHERE driver_id = ? AND ended_at IS NULL").run(
      new Date().toISOString(),
      driverId,
    );
  }
}

export function getSubscriptionStats() {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const sum = (sql: string, ...params: unknown[]) =>
    (db.prepare(sql).get(...params) as { n: number | null }).n ?? 0;
  return {
    subscriptionRevenueMonth: sum(
      "SELECT SUM(amount) AS n FROM subscriptions WHERE status = 'paid' AND paid_at >= ?",
      monthStart.toISOString(),
    ),
    subscriptionRevenueTotal: sum("SELECT SUM(amount) AS n FROM subscriptions WHERE status = 'paid'"),
    activeSubscribers: sum("SELECT COUNT(*) AS n FROM drivers WHERE subscription_until > ?", new Date().toISOString()),
    pendingSubscriptions: sum("SELECT COUNT(*) AS n FROM subscriptions WHERE status = 'pending'"),
  };
}

/** Demandes en attente et derniers paiements, pour le tableau de bord. */
export function listSubscriptionsForAdmin() {
  return db
    .prepare(
      `SELECT s.id, s.driver_id AS driverId, u.name AS driverName, u.phone AS driverPhone, s.plan, s.amount,
              s.status, s.requested_at AS requestedAt, s.paid_at AS paidAt, s.ends_at AS endsAt
         FROM subscriptions s JOIN users u ON u.id = s.driver_id
        WHERE s.status IN ('pending', 'paid')
        ORDER BY CASE s.status WHEN 'pending' THEN 0 ELSE 1 END, COALESCE(s.paid_at, s.requested_at) DESC
        LIMIT 300`,
    )
    .all();
}
