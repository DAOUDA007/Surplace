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
