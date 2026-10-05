import type { LatLng } from "./types";

export interface LocateResult {
  point: LatLng;
  /** Rayon d'incertitude en mètres, fourni par l'appareil. */
  accuracy: number;
}

/** Précision jugée suffisante pour arrêter d'affiner (en mètres). */
const GOOD_ACCURACY_M = 30;
/** Durée maximale pendant laquelle on attend que le GPS s'affine. */
const REFINE_MS = 15_000;

export function geolocationErrorMessage(code: number | "insecure" | "unsupported"): string {
  switch (code) {
    case "insecure":
      return "La localisation est bloquée car le site n'est pas ouvert en connexion sécurisée (https). Ouvrez-le en https, ou depuis l'ordinateur via http://localhost:3000. En attendant, choisissez votre départ sur la carte.";
    case "unsupported":
      return "Votre navigateur ne permet pas la localisation. Choisissez votre départ sur la carte.";
    case 1:
      return "L'accès à votre position est refusé. Autorisez-le dans les réglages du navigateur (icône 🔒 à gauche de l'adresse du site), puis touchez « Ma position ».";
    case 2:
      return "Position introuvable. Activez la localisation (GPS) de votre téléphone, puis réessayez.";
    default:
      return "La localisation prend trop de temps. Vérifiez que le GPS est activé, ou choisissez votre départ sur la carte.";
  }
}

/**
 * Localise l'utilisateur en affinant la position : la première lecture est souvent
 * approximative (réseau, Wi-Fi), puis le GPS devient plus précis.
 * `onUpdate` est appelé à chaque amélioration ; la promesse renvoie la meilleure lecture.
 */
export function locateUser(onUpdate?: (r: LocateResult) => void): Promise<LocateResult> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(new Error(geolocationErrorMessage("insecure")));
      return;
    }
    if (!("geolocation" in navigator)) {
      reject(new Error(geolocationErrorMessage("unsupported")));
      return;
    }

    let best: LocateResult | null = null;
    let done = false;

    const finish = (error?: GeolocationPositionError) => {
      if (done) return;
      done = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      if (best) resolve(best);
      else reject(new Error(geolocationErrorMessage(error?.code ?? 3)));
    };

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const reading = {
          point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          accuracy: Math.round(pos.coords.accuracy),
        };
        if (!best || reading.accuracy < best.accuracy) {
          best = reading;
          onUpdate?.(reading);
        }
        if (reading.accuracy <= GOOD_ACCURACY_M) finish();
      },
      (err) => {
        // Refus : inutile d'insister. Autres erreurs : on garde la meilleure lecture si on en a une.
        if (err.code === err.PERMISSION_DENIED || !best) {
          if (err.code === err.TIMEOUT && !best) {
            fallback();
            return;
          }
          finish(err);
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: REFINE_MS },
    );

    // Si le GPS ne répond pas du tout, on tente une position approximative (réseau).
    let fallingBack = false;
    const fallback = () => {
      if (fallingBack || done) return;
      fallingBack = true;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          best = {
            point: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            accuracy: Math.round(pos.coords.accuracy),
          };
          onUpdate?.(best);
          finish();
        },
        (err) => finish(err),
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 10_000 },
      );
    };

    const timer = setTimeout(() => (best ? finish() : fallback()), REFINE_MS);
  });
}
