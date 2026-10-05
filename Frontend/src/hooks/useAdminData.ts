"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

/** Prévient le menu latéral que les compteurs (pastilles) doivent être recalculés. */
export function notifyAdminChange() {
  window.dispatchEvent(new Event("admin:changed"));
}

/**
 * Charge une ressource d'administration, la rafraîchit périodiquement
 * et la recharge quand `path` change (filtres, recherche).
 */
export function useAdminData<T>(path: string, intervalMs = 15_000) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const current = useRef(path);
  current.current = path;

  const refresh = useCallback(async () => {
    try {
      const result = await api<T>(path);
      // On ignore une réponse arrivée après un changement de filtre.
      if (current.current === path) {
        setData(result);
        setError("");
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    setLoading(true);
    refresh();
    const timer = setInterval(refresh, intervalMs);
    window.addEventListener("admin:changed", refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener("admin:changed", refresh);
    };
  }, [refresh, intervalMs]);

  return { data, error, loading, refresh };
}

/** Exécute une action d'administration (POST), puis rafraîchit tous les écrans et compteurs. */
export function useAdminAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const run = useCallback(async (key: string, path: string, body: unknown = {}) => {
    setBusy(key);
    setError("");
    try {
      await api(path, body);
      notifyAdminChange();
      return true;
    } catch (err) {
      setError((err as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  return { busy, error, run, setError };
}
