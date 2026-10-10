// ⚠️ Fichier copié depuis Commun/lib/permissions.ts par scripts/sync-commun.mjs : modifiez l'original dans Commun/.
import type { AdminPermission, AdminRole } from "./types";

/** Écrans et actions accessibles à chaque rôle d'administrateur. */
export const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  full: [
    "rides",
    "drivers",
    "passengers",
    "subscriptions",
    "reviews",
    "messages",
    "complaints",
    "alerts",
    "places",
    "settings",
    "exports",
    "reports",
    "broadcast",
    "audit",
    "system",
  ],
  operations: ["rides", "drivers", "passengers", "alerts", "complaints", "places"],
  finance: ["subscriptions", "exports", "reports", "settings"],
  moderation: ["reviews", "messages", "complaints"],
};

export const ROLE_LABELS: Record<AdminRole, { label: string; description: string }> = {
  full: { label: "Accès complet", description: "Tous les écrans et réglages" },
  operations: { label: "Opérations", description: "Courses, chauffeurs, passagers, urgences, réclamations, lieux" },
  finance: { label: "Finances", description: "Abonnements, tarifs, rapports et exports" },
  moderation: { label: "Modération", description: "Avis, messages, réclamations" },
};

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === "string" && value in ROLE_PERMISSIONS;
}

/** L'administrateur principal a toujours un accès complet. */
export function permissionsFor(role: AdminRole, isPrincipal: boolean): AdminPermission[] {
  return isPrincipal ? ROLE_PERMISSIONS.full : ROLE_PERMISSIONS[role] ?? [];
}
