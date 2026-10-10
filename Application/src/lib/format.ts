// ⚠️ Fichier copié depuis Commun/lib/format.ts par scripts/sync-commun.mjs : modifiez l'original dans Commun/.
import type { RideStatus } from "./types";

export const STATUS_LABELS: Record<RideStatus, string> = {
  requested: "Recherche de chauffeur",
  accepted: "Chauffeur en route",
  arrived: "Chauffeur arrivé",
  in_progress: "En course",
  completed: "Terminée",
  cancelled: "Annulée",
};

export const STATUS_STYLES: Record<RideStatus, string> = {
  requested: "bg-amber-100 text-amber-800",
  accepted: "bg-sky-100 text-sky-800",
  arrived: "bg-sky-100 text-sky-800",
  in_progress: "bg-violet-100 text-violet-800",
  completed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-line text-muted",
};

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPhone(phone: string) {
  return phone.replace(/(\d{2})(?=\d)/g, "$1 ");
}

export function minutesFromKm(km: number, speedKmh = 25) {
  return Math.max(1, Math.round((km / speedKmh) * 60));
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

/** 135 → « 2 h 15 » ; 40 → « 40 min ». */
export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
}

/** « il y a 5 min », « il y a 2 h », sinon la date. */
export function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `il y a ${Math.floor(s / 3600)} h`;
  return formatDateTime(iso);
}

/** Valeur pour un champ <input type="datetime-local"> (heure locale de l'appareil). */
export function toLocalInput(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
