import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "./types";

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

/** Administrateur connecté, ou null (pas de session, autre rôle, ou Backend injoignable). */
export async function getAdmin(): Promise<User | null> {
  try {
    const session = await backendGet<{ user: User }>("/me");
    return session?.user.role === "admin" ? session.user : null;
  } catch (err) {
    console.error("Backend injoignable :", (err as Error).message);
    return null;
  }
}

/** Renvoie l'administrateur connecté, sinon redirige vers la page de connexion. */
export async function requireAdmin(): Promise<User> {
  const admin = await getAdmin();
  if (!admin) redirect("/connexion");
  return admin;
}
