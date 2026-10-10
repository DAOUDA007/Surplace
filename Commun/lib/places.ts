import type { LatLng, Place } from "./types";

export const CITY_NAME = "Korhogo";
export const CITY_CENTER: LatLng = { lat: 9.458, lng: -5.6296 };

/** Lieux fréquents à Korhogo (coordonnées approximatives, à vérifier sur le terrain). */
export const POPULAR_PLACES: Place[] = [
  { label: "Centre-ville, Grand marché", lat: 9.4555, lng: -5.6305 },
  { label: "Gare routière", lat: 9.4505, lng: -5.634 },
  { label: "Grande Mosquée", lat: 9.459, lng: -5.632 },
  { label: "Préfecture", lat: 9.463, lng: -5.627 },
  { label: "CHR de Korhogo", lat: 9.45, lng: -5.62 },
  { label: "Université Peleforo Gon Coulibaly", lat: 9.429, lng: -5.606 },
  { label: "Lycée Houphouët-Boigny", lat: 9.461, lng: -5.62 },
  { label: "Aéroport de Korhogo", lat: 9.3873, lng: -5.5567 },
  { label: "Quartier Soba", lat: 9.468, lng: -5.62 },
  { label: "Quartier Petit-Paris", lat: 9.462, lng: -5.64 },
  { label: "Quartier Koko", lat: 9.448, lng: -5.642 },
  { label: "Quartier Haoussabougou", lat: 9.454, lng: -5.623 },
  { label: "Quartier Résidentiel", lat: 9.465, lng: -5.633 },
  { label: "Quartier Banaforo", lat: 9.442, lng: -5.63 },
  { label: "Quartier Natiokobadara", lat: 9.475, lng: -5.615 },
  { label: "Waraniéné, village des tisserands", lat: 9.418, lng: -5.647 },
];

function normalize(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Lieux fréquents correspondant à la saisie. `places` : la liste gérée dans l'administration
 * (POPULAR_PLACES ne sert qu'en secours, si le serveur ne répond pas).
 */
export function searchPopularPlaces(query: string, places: Place[] = POPULAR_PLACES): Place[] {
  const q = normalize(query.trim());
  if (!q) return places.slice(0, 6);
  return places.filter((p) => normalize(p.label).includes(q)).slice(0, 6);
}

const NOMINATIM = "https://nominatim.openstreetmap.org";

function shortLabel(displayName: string) {
  return displayName.split(",").slice(0, 3).map((s) => s.trim()).join(", ");
}

/** Recherche d'adresse via OpenStreetMap (Nominatim), limitée à Korhogo et ses environs. */
export async function searchAddress(query: string, signal?: AbortSignal): Promise<Place[]> {
  const params = new URLSearchParams({
    format: "jsonv2",
    q: query,
    countrycodes: "ci",
    viewbox: "-5.8,9.6,-5.45,9.3",
    bounded: "1",
    limit: "5",
    "accept-language": "fr",
  });
  const res = await fetch(`${NOMINATIM}/search?${params}`, { signal });
  if (!res.ok) return [];
  const rows = (await res.json()) as { display_name: string; lat: string; lon: string }[];
  return rows.map((r) => ({ label: shortLabel(r.display_name), lat: Number(r.lat), lng: Number(r.lon) }));
}

/** Nom lisible d'un point choisi sur la carte. */
export async function reverseGeocode(point: LatLng): Promise<string> {
  const fallback = `Point sur la carte (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`;
  try {
    const params = new URLSearchParams({
      format: "jsonv2",
      lat: String(point.lat),
      lon: String(point.lng),
      zoom: "17",
      "accept-language": "fr",
    });
    const res = await fetch(`${NOMINATIM}/reverse?${params}`);
    if (!res.ok) return fallback;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name ? shortLabel(data.display_name) : fallback;
  } catch {
    return fallback;
  }
}
