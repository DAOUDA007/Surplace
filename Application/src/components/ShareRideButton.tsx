"use client";

import { useState } from "react";
import { api } from "@/lib/api";

/** Partage le suivi en direct de la course avec un proche (WhatsApp, SMS… via le menu de partage du téléphone). */
export function ShareRideButton({ rideId, className = "" }: { rideId: number; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function share() {
    setBusy(true);
    setMessage("");
    try {
      const { url } = await api<{ url: string }>(`/api/rides/${rideId}/share`, {});
      const text = "Je suis en route avec SURPLACE. Suis ma course en direct :";
      if (navigator.share) {
        await navigator.share({ title: "Ma course SURPLACE", text, url }).catch(() => null);
      } else {
        window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, "_blank");
      }
      await navigator.clipboard?.writeText(url).catch(() => null);
      setMessage("Lien copié.");
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={share}
        disabled={busy}
        className={`inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 disabled:opacity-60 ${className}`}
      >
        📤 Partager ma course
      </button>
      {message && <span className="mt-1 text-xs text-muted">{message}</span>}
    </span>
  );
}
