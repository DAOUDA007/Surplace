import type { NextFunction, Request, Response } from "express";
import { HttpError } from "./http";

/**
 * Compteur d'événements par clé (numéro, adresse IP…) sur une fenêtre glissante, en mémoire.
 * Sert à limiter les tentatives de connexion, les codes SMS, les commandes sans compte, etc.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private max: number,
    private windowMs: number,
  ) {
    limiters.add(this);
  }

  private recent(key: string) {
    const now = Date.now();
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length) this.hits.set(key, list);
    else this.hits.delete(key);
    return list;
  }

  isLimited(key: string) {
    return this.recent(key).length >= this.max;
  }

  hit(key: string) {
    this.hits.set(key, [...this.recent(key), Date.now()]);
  }

  reset(key: string) {
    this.hits.delete(key);
  }

  /** Minutes avant qu'une nouvelle tentative soit possible. */
  minutesLeft(key: string) {
    const list = this.recent(key);
    if (list.length < this.max) return 0;
    const oldest = list[list.length - this.max];
    return Math.max(1, Math.ceil((oldest + this.windowMs - Date.now()) / 60_000));
  }

  /** Lève une erreur 429 si la limite est atteinte. `{minutes}` est remplacé dans le message. */
  check(key: string, message: string) {
    if (this.isLimited(key)) {
      throw new HttpError(429, message.replace("{minutes}", String(this.minutesLeft(key))));
    }
  }

  sweep() {
    for (const key of [...this.hits.keys()]) this.recent(key);
  }
}

const limiters = new Set<RateLimiter>();

// Nettoyage régulier pour que la mémoire ne grossisse pas indéfiniment.
setInterval(() => limiters.forEach((l) => l.sweep()), 10 * 60_000).unref();

/** Connexion : 5 échecs par numéro et 30 par adresse IP, sur 15 minutes. */
export const loginByPhone = new RateLimiter(5, 15 * 60_000);
export const loginByIp = new RateLimiter(30, 15 * 60_000);

/** Limite générale de l'API : 600 requêtes par minute et par adresse IP (le suivi GPS en envoie ~40). */
const apiByIp = new RateLimiter(600, 60_000);

export function apiRateLimit(req: Request, res: Response, next: NextFunction) {
  const key = req.ip ?? "inconnu";
  if (apiByIp.isLimited(key)) {
    res.status(429).json({ error: "Trop de requêtes. Patientez une minute." });
    return;
  }
  apiByIp.hit(key);
  next();
}
