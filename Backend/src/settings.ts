import { db } from "./db";
import { HttpError } from "./http";
import { DEFAULT_SETTINGS } from "./pricing";
import type { AppSettings } from "./types";

/**
 * Réglages modifiables depuis l'administration (tarifs, majorations, abonnements, attribution…).
 * Stockés en JSON dans la table settings ; les valeurs absentes reprennent DEFAULT_SETTINGS (pricing.ts).
 */
let cache: AppSettings | null = null;

function merge<T>(defaults: T, saved: unknown): T {
  if (!saved || typeof saved !== "object" || Array.isArray(saved)) return defaults;
  const result: Record<string, unknown> = { ...(defaults as Record<string, unknown>) };
  for (const [key, value] of Object.entries(defaults as Record<string, unknown>)) {
    const incoming = (saved as Record<string, unknown>)[key];
    if (incoming === undefined) continue;
    result[key] =
      value && typeof value === "object" && !Array.isArray(value) ? merge(value, incoming) : incoming;
  }
  return result as T;
}

export function getSettings(): AppSettings {
  if (cache) return cache;
  const row = db.prepare("SELECT value FROM settings WHERE key = 'app'").get() as { value: string } | undefined;
  let saved: unknown = null;
  try {
    saved = row ? JSON.parse(row.value) : null;
  } catch {
    saved = null;
  }
  cache = merge(DEFAULT_SETTINGS, saved);
  return cache;
}

function num(value: unknown, label: string, min: number, max: number, integer = true) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
    throw new HttpError(400, `${label} : valeur entre ${min} et ${max} attendue.`);
  }
  return n;
}

const bool = (value: unknown) => value === true;

/** Valide et enregistre les réglages envoyés par l'administration. */
export function updateSettings(input: unknown): AppSettings {
  const s = merge(getSettings(), input);
  const next: AppSettings = {
    pricing: {
      baseFare: num(s.pricing.baseFare, "Prise en charge", 0, 5000),
      perKm: num(s.pricing.perKm, "Prix au km", 1, 5000),
      minimumFare: num(s.pricing.minimumFare, "Prix minimum", 0, 50_000),
      roundTo: num(s.pricing.roundTo, "Arrondi", 1, 1000),
      averageSpeedKmh: num(s.pricing.averageSpeedKmh, "Vitesse moyenne", 5, 80),
      roadFactor: num(s.pricing.roadFactor, "Facteur route", 1, 2, false),
    },
    surcharges: {
      night: {
        enabled: bool(s.surcharges.night.enabled),
        startHour: num(s.surcharges.night.startHour, "Début de la nuit", 0, 23),
        endHour: num(s.surcharges.night.endHour, "Fin de la nuit", 0, 23),
        percent: num(s.surcharges.night.percent, "Majoration de nuit", 0, 200),
      },
      rain: {
        active: bool(s.surcharges.rain.active),
        percent: num(s.surcharges.rain.percent, "Majoration de pluie", 0, 200),
      },
    },
    plans: {
      monthly: num(s.plans.monthly, "Abonnement mensuel", 0, 1_000_000),
      yearly: num(s.plans.yearly, "Abonnement annuel", 0, 10_000_000),
    },
    dispatch: {
      mode: s.dispatch.mode === "open" ? "open" : "auto",
      offerSeconds: num(s.dispatch.offerSeconds, "Délai de réponse du chauffeur", 10, 120),
      maxOffers: num(s.dispatch.maxOffers, "Chauffeurs sollicités", 1, 10),
    },
    referralDays: num(s.referralDays, "Jours offerts au parrain", 0, 90),
    documentsRequired: bool(s.documentsRequired),
  };
  db.prepare(
    "INSERT INTO settings (key, value, updated_at) VALUES ('app', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  ).run(JSON.stringify(next), new Date().toISOString());
  cache = next;
  return next;
}
