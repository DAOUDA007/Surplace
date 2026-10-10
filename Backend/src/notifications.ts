import { db } from "./db";
import { publishToUser } from "./events";
import { HttpError } from "./http";
import { sendPush } from "./push";
import { sendSmsInBackground } from "./sms";
import type { AppNotification, BroadcastRecord, User } from "./types";
import { requiredText } from "./validation";

export interface NotifyOptions {
  url?: string;
  /** Notification push sur le téléphone (par défaut : oui). */
  push?: boolean;
  /** Aussi par SMS (numéros réels uniquement). */
  sms?: boolean;
  tag?: string;
}

/**
 * Notification dans l'application (cloche 🔔), avec push sur le téléphone et SMS en option.
 * Renvoie le nombre de destinataires.
 */
export function notifyUsers(userIds: number[], title: string, body: string, options: NotifyOptions = {}) {
  if (userIds.length === 0) return 0;
  const now = new Date().toISOString();
  const insert = db.prepare("INSERT INTO notifications (user_id, title, body, url, created_at) VALUES (?, ?, ?, ?, ?)");
  db.transaction(() => {
    for (const id of userIds) insert.run(id, title, body, options.url ?? null, now);
  })();
  for (const id of userIds) {
    publishToUser(id, { type: "notification" });
    if (options.push !== false) sendPush(id, { title, body, url: options.url, tag: options.tag });
  }
  if (options.sms) {
    const phones = db
      .prepare(
        `SELECT COALESCE(guest_phone, phone) AS phone FROM users
          WHERE id IN (${userIds.map(() => "?").join(",")}) AND deleted_at IS NULL`,
      )
      .all(...userIds) as { phone: string }[];
    for (const { phone } of phones) {
      if (/^0\d{9}$/.test(phone)) sendSmsInBackground(phone, `SURPLACE : ${title}. ${body}`);
    }
  }
  return userIds.length;
}

export function notifyUser(userId: number, title: string, body: string, options: NotifyOptions = {}) {
  notifyUsers([userId], title, body, options);
}

export function listNotifications(userId: number) {
  const items = db
    .prepare(
      `SELECT id, title, body, url, created_at AS createdAt, read_at AS readAt
         FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50`,
    )
    .all(userId) as AppNotification[];
  const unread = (
    db.prepare("SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND read_at IS NULL").get(userId) as {
      n: number;
    }
  ).n;
  return { items, unread };
}

export function markNotificationsRead(userId: number) {
  db.prepare("UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL").run(
    new Date().toISOString(),
    userId,
  );
}

// --- Messages groupés (administration) ---

const AUDIENCES: Record<string, { label: string; sql: string }> = {
  drivers: {
    label: "Tous les chauffeurs",
    sql: "SELECT u.id FROM users u JOIN drivers d ON d.user_id = u.id WHERE u.deleted_at IS NULL AND u.blocked = 0",
  },
  "drivers-approved": {
    label: "Chauffeurs validés",
    sql: "SELECT u.id FROM users u JOIN drivers d ON d.user_id = u.id WHERE u.deleted_at IS NULL AND u.blocked = 0 AND d.status = 'approved'",
  },
  "drivers-online": {
    label: "Chauffeurs en ligne",
    sql: "SELECT u.id FROM users u JOIN drivers d ON d.user_id = u.id WHERE u.deleted_at IS NULL AND d.is_online = 1",
  },
  passengers: {
    label: "Tous les passagers",
    sql: "SELECT id FROM users WHERE role = 'passenger' AND deleted_at IS NULL AND blocked = 0",
  },
  all: {
    label: "Tout le monde (passagers et chauffeurs)",
    sql: "SELECT id FROM users WHERE role IN ('passenger', 'driver') AND deleted_at IS NULL AND blocked = 0",
  },
};

export const BROADCAST_AUDIENCES = Object.entries(AUDIENCES).map(([value, a]) => ({ value, label: a.label }));

export function broadcast(admin: User, body: Record<string, unknown>) {
  const audience = AUDIENCES[String(body.audience)];
  if (!audience) throw new HttpError(400, "Destinataires inconnus.");
  const title = requiredText(body.title, "Titre", 80);
  const message = requiredText(body.message, "Message", 500);
  const sms = body.sms === true;
  const ids = (db.prepare(audience.sql).all() as { id: number }[]).map((r) => r.id);
  const recipients = notifyUsers(ids, title, message, { sms, tag: "broadcast" });
  db.prepare(
    "INSERT INTO broadcasts (audience, title, body, sms, recipients, admin_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(audience.label, title, message, sms ? 1 : 0, recipients, admin.name, new Date().toISOString());
  return { recipients };
}

export function listBroadcasts() {
  return db
    .prepare(
      `SELECT id, audience, title, body, sms, recipients, admin_name AS adminName, created_at AS createdAt
         FROM broadcasts ORDER BY id DESC LIMIT 50`,
    )
    .all() as BroadcastRecord[];
}
