"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

/**
 * Enregistre le service worker (/sw.js) : notifications push et page « hors connexion ».
 * Garde aussi l'invitation d'installation du navigateur pour le bouton « Installer l'application ».
 */
export function PwaSetup() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => null);
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      listeners.forEach((l) => l());
    };
    const onInstalled = () => {
      deferredPrompt = null;
      listeners.forEach((l) => l());
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  return null;
}

/** Bouton « Installer l'application » : visible seulement quand le navigateur le propose (Android, Chrome…). */
export function InstallButton({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    const update = () => setAvailable(!!deferredPrompt);
    update();
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);
  if (!available) return null;
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
        listeners.forEach((l) => l());
      }}
    >
      {children ?? "📲 Installer l'application"}
    </button>
  );
}
