import { randomBytes } from "node:crypto";
import type { Request, Response } from "express";
import { db } from "./db";
import { HttpError } from "./http";
import { permissionsFor } from "./permissions";
import type { AdminPermission, AdminRole, Role, User } from "./types";

export const SESSION_COOKIE = "surplace_session";
const SESSION_DAYS = 30;

export function createSession(res: Response, userId: number) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").run(
    token,
    userId,
    expires.toISOString(),
  );
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export function destroySession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (token) db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function getCurrentUser(req: Request): User | null {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  const row = db
    .prepare(
      `SELECT u.id, u.role, u.name, COALESCE(u.guest_phone, u.phone) AS phone, u.email,
              u.is_principal AS isPrincipal, u.guest AS isGuest, u.admin_role AS adminRole,
              u.emergency_contact_name AS emergencyContactName, u.emergency_contact_phone AS emergencyContactPhone
         FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token = ? AND s.expires_at > ? AND u.blocked = 0 AND u.deleted_at IS NULL`,
    )
    .get(token, new Date().toISOString()) as
    | (Omit<User, "isPrincipal" | "isGuest" | "adminRole"> & { isPrincipal: number; isGuest: number; adminRole: AdminRole })
    | undefined;
  if (!row) return null;
  const { isPrincipal, isGuest, adminRole, emergencyContactName, emergencyContactPhone, ...user } = row;
  if (user.role === "admin") {
    const principal = isPrincipal === 1;
    return { ...user, isPrincipal: principal, adminRole, permissions: permissionsFor(adminRole, principal) };
  }
  return { ...user, emergencyContactName, emergencyContactPhone, ...(isGuest ? { isGuest: true } : {}) };
}

/** Lève une erreur 401/403 si l'utilisateur n'est pas connecté ou n'a pas le bon rôle. */
export function requireUser(req: Request, role?: Role): User {
  const user = getCurrentUser(req);
  if (!user) throw new HttpError(401, "Veuillez vous connecter.");
  if (role && user.role !== role) throw new HttpError(403, "Accès refusé.");
  return user;
}

/** Administrateur connecté ayant le droit demandé (voir permissions.ts). */
export function requireAdmin(req: Request, permission?: AdminPermission): User {
  const user = requireUser(req, "admin");
  if (permission && !user.permissions?.includes(permission)) {
    throw new HttpError(403, "Votre rôle d'administrateur ne permet pas cette action.");
  }
  return user;
}

/** Page d'accueil après connexion. Les administrateurs ont leur propre site : « / » y est la vue d'ensemble. */
export function homeFor(role: Role) {
  return role === "driver" ? "/chauffeur" : role === "admin" ? "/" : "/passager";
}
