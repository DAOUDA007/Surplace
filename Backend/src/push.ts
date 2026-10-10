import fs from "node:fs";
import path from "node:path";
import webpush from "web-push";
import { db, DB_PATH } from "./db";
import { HttpError } from "./http";

/**
 * Notifications « push » : elles s'affichent sur le téléphone même quand l'application est fermée
 * (application installée ou navigateur ouvert en arrière-plan).
 *
 * Clés VAPID : VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY dans Backend/.env, sinon générées au premier
 * démarrage et conservées dans data/vapid.json (ne pas les changer : les abonnements existants seraient perdus).
 */
const VAPID_FILE = path.join(path.dirname(DB_PATH), "vapid.json");

function loadKeys() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY };
  }
  try {
    return JSON.parse(fs.readFileSync(VAPID_FILE, "utf8")) as { publicKey: string; privateKey: string };
  } catch {
    const keys = webpush.generateVAPIDKeys();
    fs.mkdirSync(path.dirname(VAPID_FILE), { recursive: true });
    fs.writeFileSync(VAPID_FILE, JSON.stringify(keys, null, 2));
    return keys;
  }
}

const keys = loadKeys();
webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:contact@surplace.ci", keys.publicKey, keys.privateKey);

export const pushPublicKey = keys.publicKey;

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  /** Les notifications de même tag se remplacent au lieu de s'empiler. */
  tag?: string;
}

export function saveSubscription(userId: number, input: unknown) {
  const sub = input as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (
    typeof sub?.endpoint !== "string" ||
    !sub.endpoint.startsWith("https://") ||
    typeof sub.keys?.p256dh !== "string" ||
    typeof sub.keys?.auth !== "string"
  ) {
    throw new HttpError(400, "Abonnement aux notifications invalide.");
  }
  db.prepare(
    `INSERT INTO push_subscriptions (user_id, endpoint, keys, created_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET user_id = excluded.user_id, keys = excluded.keys`,
  ).run(userId, sub.endpoint, JSON.stringify(sub.keys), new Date().toISOString());
}

export function removeSubscription(endpoint: unknown) {
  if (typeof endpoint === "string") db.prepare("DELETE FROM push_subscriptions WHERE endpoint = ?").run(endpoint);
}

/** Envoie une notification à tous les appareils d'un utilisateur (sans attendre, sans jamais échouer). */
export function sendPush(userId: number, payload: PushPayload) {
  const subs = db.prepare("SELECT endpoint, keys FROM push_subscriptions WHERE user_id = ?").all(userId) as {
    endpoint: string;
    keys: string;
  }[];
  for (const sub of subs) {
    webpush
      .sendNotification({ endpoint: sub.endpoint, keys: JSON.parse(sub.keys) }, JSON.stringify(payload), { TTL: 3600 })
      .catch((err: { statusCode?: number; message?: string }) => {
        // Abonnement expiré ou révoqué par le téléphone : on l'oublie.
        if (err.statusCode === 404 || err.statusCode === 410) removeSubscription(sub.endpoint);
        else console.error("[push] Échec :", err.message);
      });
  }
}

export function pushStats() {
  return (db.prepare("SELECT COUNT(*) AS n FROM push_subscriptions").get() as { n: number }).n;
}
