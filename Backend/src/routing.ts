import { activeSurcharges, durationFor, estimateTrip, priceFor } from "./pricing";
import { getSettings } from "./settings";
import type { LatLng, TripEstimate } from "./types";

/**
 * Distance et durée d'un trajet.
 * Avec OSRM_URL (serveur d'itinéraires OSRM, ex. http://localhost:5000), la distance est mesurée par la route
 * et le tracé est renvoyé. Sinon, ou si OSRM ne répond pas : ligne droite × facteur route (réglable).
 */
const OSRM_URL = process.env.OSRM_URL?.replace(/\/$/, "");
export const osrmEnabled = !!OSRM_URL;

const cache = new Map<string, { distanceKm: number; durationMin: number; geometry: LatLng[] }>();

function cacheKey(a: LatLng, b: LatLng) {
  return [a.lat, a.lng, b.lat, b.lng].map((n) => n.toFixed(4)).join(",");
}

/** Garde au plus ~150 points du tracé (suffisant pour l'affichage, plus léger à transmettre). */
function simplify(points: LatLng[]) {
  if (points.length <= 150) return points;
  const step = Math.ceil(points.length / 150);
  return points.filter((_, i) => i % step === 0 || i === points.length - 1);
}

async function osrmRoute(a: LatLng, b: LatLng) {
  const key = cacheKey(a, b);
  const hit = cache.get(key);
  if (hit) return hit;
  const url = `${OSRM_URL}/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`OSRM ${res.status}`);
  const data = (await res.json()) as {
    code: string;
    routes?: { distance: number; duration: number; geometry: { coordinates: [number, number][] } }[];
  };
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route) throw new Error(`OSRM ${data.code}`);
  const result = {
    distanceKm: Math.round((route.distance / 1000) * 10) / 10,
    durationMin: Math.max(3, Math.round(route.duration / 60)),
    geometry: simplify(route.geometry.coordinates.map(([lng, lat]) => ({ lat, lng }))),
  };
  if (cache.size > 500) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}

/** Estimation complète : distance, durée, prix avec majorations en vigueur (heure de prise en charge). */
export async function estimateRoute(pickup: LatLng, dropoff: LatLng, at = new Date()): Promise<TripEstimate> {
  const settings = getSettings();
  const surcharge = activeSurcharges(settings, at);
  let distanceKm: number;
  let durationMin: number;
  let geometry: LatLng[] | null = null;
  let source: TripEstimate["source"] = "estimate";

  if (OSRM_URL) {
    try {
      const route = await osrmRoute(pickup, dropoff);
      ({ distanceKm, durationMin, geometry } = route);
      source = "osrm";
    } catch (err) {
      console.error("[itinéraire] OSRM indisponible, estimation à vol d'oiseau :", (err as Error).message);
    }
  }
  if (source === "estimate") {
    ({ distanceKm, durationMin } = estimateTrip(pickup, dropoff, settings.pricing));
  } else {
    durationMin = Math.max(durationMin!, durationFor(distanceKm!, settings.pricing) - 2);
  }

  return {
    distanceKm: distanceKm!,
    durationMin: durationMin!,
    price: priceFor(distanceKm!, settings.pricing, surcharge.percent),
    basePrice: priceFor(distanceKm!, settings.pricing, 0),
    surchargePercent: surcharge.percent,
    surchargeLabels: surcharge.labels,
    geometry,
    source,
  };
}
