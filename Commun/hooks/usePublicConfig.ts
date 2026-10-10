"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AppSettings, Place } from "@/lib/types";

/** Réglages publics fournis par le serveur : tarifs, majorations en cours, lieux fréquents, options. */
export interface PublicConfig {
  settings: AppSettings;
  surcharge: { percent: number; labels: string[] };
  /** Les codes de vérification par SMS sont-ils demandés ? */
  otpRequired: boolean;
  pushPublicKey: string;
  places: Place[];
}

let cache: { at: number; promise: Promise<PublicConfig> } | null = null;

/** Chargée une fois puis gardée 5 minutes (partagée par tous les composants de la page). */
export function loadPublicConfig() {
  if (!cache || Date.now() - cache.at > 5 * 60_000) {
    const promise = api<PublicConfig>("/api/public/config");
    cache = { at: Date.now(), promise };
    promise.catch(() => {
      cache = null;
    });
  }
  return cache.promise;
}

export function usePublicConfig() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  useEffect(() => {
    let alive = true;
    loadPublicConfig()
      .then((c) => alive && setConfig(c))
      .catch(() => null);
    return () => {
      alive = false;
    };
  }, []);
  return config;
}
