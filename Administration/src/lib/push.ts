"use client";
// ⚠️ Fichier copié depuis Commun/lib/push.ts par scripts/sync-commun.mjs : modifiez l'original dans Commun/.

import { api } from "./api";

/**
 * Notifications push : le téléphone affiche une notification même quand le site est fermé.
 * Nécessite le service worker /sw.js (enregistré par PwaSetup) et l'autorisation de l'utilisateur.
 */
export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export async function currentPushSubscription() {
  if (!pushSupported()) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return (await registration?.pushManager.getSubscription()) ?? null;
}

/** Demande l'autorisation et abonne cet appareil. Renvoie false si refusé ou impossible. */
export async function enablePush() {
  if (!pushSupported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  const registration = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const { publicKey } = await api<{ publicKey: string }>("/api/push/key");
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
  await api("/api/push/subscribe", { subscription: subscription.toJSON() });
  return true;
}

export async function disablePush() {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  await api("/api/push/unsubscribe", { endpoint: subscription.endpoint }).catch(() => null);
  await subscription.unsubscribe();
}

/** Si l'utilisateur a déjà accepté, réabonne silencieusement l'appareil (après connexion). */
export async function refreshPushSubscription() {
  if (!pushSupported() || Notification.permission !== "granted") return;
  await enablePush().catch(() => null);
}
