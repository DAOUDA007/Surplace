import type { AppSettings, LatLng, PricingSettings } from "./types";

/**
 * Grille tarifaire PAR DÉFAUT, en FCFA.
 * Les valeurs réellement appliquées se règlent dans l'administration (écran « Tarifs et réglages ») ;
 * celles-ci ne servent qu'au premier démarrage et en secours.
 */
export const PRICING: PricingSettings = {
  baseFare: 0,
  perKm: 50,
  minimumFare: 200,
  roundTo: 25,
  averageSpeedKmh: 25,
  // Les trajets routiers sont plus longs que la ligne droite.
  roadFactor: 1.3,
};

// Abonnement des chauffeurs (pas de commission sur les courses). Prix par défaut, réglables dans l'administration.
export const SUBSCRIPTION_PLANS = {
  monthly: { label: "Mensuel", price: 1000, months: 1 },
  yearly: { label: "Annuel", price: 10000, months: 12 },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

/** Réglages par défaut de l'application (voir AppSettings). */
export const DEFAULT_SETTINGS: AppSettings = {
  pricing: PRICING,
  surcharges: {
    night: { enabled: false, startHour: 21, endHour: 5, percent: 20 },
    rain: { active: false, percent: 15 },
  },
  plans: { monthly: SUBSCRIPTION_PLANS.monthly.price, yearly: SUBSCRIPTION_PLANS.yearly.price },
  dispatch: { mode: "auto", offerSeconds: 20, maxOffers: 3 },
  referralDays: 7,
  documentsRequired: false,
};

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Prix d'un trajet : base + distance × prix au km, majoration éventuelle, minimum, arrondi. */
export function priceFor(distanceKm: number, pricing: PricingSettings = PRICING, surchargePercent = 0) {
  const raw = (pricing.baseFare + distanceKm * pricing.perKm) * (1 + surchargePercent / 100);
  return Math.max(pricing.minimumFare, Math.ceil(raw / pricing.roundTo) * pricing.roundTo);
}

export function durationFor(distanceKm: number, pricing: PricingSettings = PRICING) {
  return Math.max(3, Math.round((distanceKm / pricing.averageSpeedKmh) * 60));
}

/** Majorations en vigueur à une date donnée (la Côte d'Ivoire est à UTC+0, toute l'année). */
export function activeSurcharges(settings: AppSettings, date = new Date()) {
  const labels: string[] = [];
  let percent = 0;
  const { night, rain } = settings.surcharges;
  if (night.enabled) {
    const hour = date.getUTCHours();
    const inNight =
      night.startHour > night.endHour
        ? hour >= night.startHour || hour < night.endHour
        : hour >= night.startHour && hour < night.endHour;
    if (inNight) {
      percent += night.percent;
      labels.push(`Nuit +${night.percent} %`);
    }
  }
  if (rain.active) {
    percent += rain.percent;
    labels.push(`Pluie +${rain.percent} %`);
  }
  return { percent, labels };
}

/** Estimation à vol d'oiseau × facteur route (utilisée sans itinéraire routier, ou en secours). */
export function estimateTrip(pickup: LatLng, dropoff: LatLng, pricing: PricingSettings = PRICING, surchargePercent = 0) {
  const distanceKm = Math.round(haversineKm(pickup, dropoff) * pricing.roadFactor * 10) / 10;
  return {
    distanceKm,
    price: priceFor(distanceKm, pricing, surchargePercent),
    durationMin: durationFor(distanceKm, pricing),
  };
}

export function formatFcfa(amount: number) {
  return `${amount.toLocaleString("fr-FR").replace(/ | /g, " ")} FCFA`;
}
