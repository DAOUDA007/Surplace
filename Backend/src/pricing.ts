// Copie partagée Backend / Application / Administration : garder les trois fichiers identiques.
import type { LatLng } from "./types";

// Grille tarifaire en FCFA (modifiable ici).
export const PRICING = {
  baseFare: 0,
  perKm: 50,
  minimumFare: 200,
  roundTo: 25,
  averageSpeedKmh: 25,
  // Les trajets routiers sont plus longs que la ligne droite.
  roadFactor: 1.3,
};

// Abonnement des chauffeurs (pas de commission sur les courses).
export const SUBSCRIPTION_PLANS = {
  monthly: { label: "Mensuel", price: 1000, months: 1 },
  yearly: { label: "Annuel", price: 10000, months: 12 },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function estimateTrip(pickup: LatLng, dropoff: LatLng) {
  const distanceKm = Math.round(haversineKm(pickup, dropoff) * PRICING.roadFactor * 10) / 10;
  const raw = PRICING.baseFare + distanceKm * PRICING.perKm;
  const price = Math.max(PRICING.minimumFare, Math.ceil(raw / PRICING.roundTo) * PRICING.roundTo);
  const durationMin = Math.max(3, Math.round((distanceKm / PRICING.averageSpeedKmh) * 60));
  return { distanceKm, price, durationMin };
}

export function formatFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;
}
