import { db } from "./db";
import type { AuditEntry, User } from "./types";

/** Enregistre une action d'administration (qui, quoi, sur quoi, quand, depuis quelle adresse). */
export function audit(admin: User, action: string, target?: string | null, details?: unknown, ip?: string) {
  db.prepare(
    "INSERT INTO audit_log (admin_id, admin_name, action, target, details, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    admin.id,
    admin.name,
    action,
    target ?? null,
    details === undefined || details === null ? null : typeof details === "string" ? details : JSON.stringify(details),
    ip ?? null,
    new Date().toISOString(),
  );
}

export function listAudit(filters: { q?: string; limit?: number }): AuditEntry[] {
  const where: string[] = ["1 = 1"];
  const params: unknown[] = [];
  const q = filters.q?.trim();
  if (q) {
    where.push("(admin_name LIKE ? OR action LIKE ? OR target LIKE ? OR details LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  return db
    .prepare(
      `SELECT id, admin_name AS adminName, action, target, details, ip, created_at AS createdAt
         FROM audit_log WHERE ${where.join(" AND ")} ORDER BY id DESC LIMIT ${Math.min(filters.limit ?? 300, 1000)}`,
    )
    .all(...params) as AuditEntry[];
}
