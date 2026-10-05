import { EventEmitter } from "node:events";
import type { ServerEvent } from "./types";

// Bus d'événements en mémoire (un seul processus serveur).
// Canaux : `user:<id>` pour un utilisateur, `drivers` pour tous les chauffeurs en ligne.
const globalForBus = globalThis as unknown as { surplaceBus?: EventEmitter };
const bus = globalForBus.surplaceBus ?? new EventEmitter();
bus.setMaxListeners(0);
globalForBus.surplaceBus = bus;

export function publish(channel: string, event: ServerEvent) {
  bus.emit(channel, event);
}

export function publishToUser(userId: number | null | undefined, event: ServerEvent) {
  if (userId) publish(`user:${userId}`, event);
}

export function subscribe(channel: string, listener: (event: ServerEvent) => void) {
  bus.on(channel, listener);
  return () => {
    bus.off(channel, listener);
  };
}
