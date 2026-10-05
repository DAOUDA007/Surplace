import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DriverProfile, Role, User } from "./types";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

/** Appel à l'API depuis un composant serveur, en transmettant le cookie de session du visiteur. */
export async function backendGet<T>(path: string): Promise<T | null> {
  const cookieHeader = (await cookies()).toString();
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    headers: cookieHeader ? { cookie: cookieHeader } : undefined,
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new Error(`API ${path} : ${res.status}`);
  return (await res.json()) as T;
}

export async function getSession() {
  try {
    return await backendGet<{ user: User; driver: DriverProfile | null }>("/me");
  } catch (err) {
    console.error("Backend injoignable :", (err as Error).message);
    return null;
  }
}

export function homeFor(role: Role) {
  return role === "driver" ? "/chauffeur" : role === "admin" ? "/admin" : "/passager";
}

/** Redirige vers la connexion, ou vers l'espace adapté si le rôle ne correspond pas. */
export async function requirePageUser(role: Role) {
  const session = await getSession();
  if (!session) redirect("/connexion");
  if (session.user.role !== role) redirect(homeFor(session.user.role));
  return session;
}
