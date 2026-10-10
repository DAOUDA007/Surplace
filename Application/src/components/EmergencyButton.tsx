"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { beep } from "@/lib/preferences";
import { CONTACT, EMERGENCY_NUMBERS } from "@/lib/site";

/** Position rapide (5 s au plus) pour l'alerte ; l'alerte part même sans position. */
function quickPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator) || !window.isSecureContext) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30_000 },
    );
  });
}

const tel = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;

/**
 * Bouton 🆘 pendant une course : prévient l'équipe SURPLACE (alerte rouge + notification), envoie un SMS à la
 * personne à prévenir avec le lien de suivi, et propose d'appeler les secours.
 */
export function EmergencyButton({ rideId, className = "" }: { rideId?: number; className?: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [result, setResult] = useState<{ shareUrl: string | null; contactNotified: boolean } | null>(null);
  const [error, setError] = useState("");

  async function trigger() {
    setState("sending");
    setError("");
    beep("alert");
    try {
      const position = await quickPosition();
      const res = await api<{ shareUrl: string | null; contactNotified: boolean }>("/api/emergency", { rideId, ...position });
      setResult(res);
      setState("sent");
    } catch (err) {
      setError((err as Error).message);
      setState("error");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-1 rounded-full bg-red-600 px-3 py-2 text-sm font-bold text-white shadow-md ${className}`}
        aria-label="Urgence"
      >
        🆘 Urgence
      </button>
      {open && (
        <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/50 p-3 md:items-center" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md space-y-4 rounded-3xl bg-surface p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-xl font-extrabold text-red-700">🆘 Urgence</p>
              <button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-muted">
                Fermer
              </button>
            </div>

            {state === "sent" ? (
              <div className="space-y-2 rounded-2xl bg-emerald-100 p-4 text-sm text-emerald-800">
                <p className="font-bold">✅ Alerte envoyée à l&apos;équipe SURPLACE.</p>
                <p>{result?.contactNotified ? "Votre personne de confiance a reçu un SMS avec votre position." : "Ajoutez une personne à prévenir dans « Mon profil » pour qu'elle reçoive un SMS la prochaine fois."}</p>
                {result?.shareUrl && (
                  <a
                    className="inline-block font-semibold underline"
                    href={`https://wa.me/?text=${encodeURIComponent(`J'ai besoin d'aide. Suis ma course en direct : ${result.shareUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Envoyer aussi le suivi par WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={trigger}
                disabled={state === "sending"}
                className="h-16 w-full rounded-2xl bg-red-600 text-lg font-extrabold text-white disabled:opacity-60"
              >
                {state === "sending" ? "Envoi de l'alerte…" : "Prévenir SURPLACE maintenant"}
              </button>
            )}
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

            <div className="space-y-2">
              <p className="text-sm font-semibold">Appeler</p>
              <a href={tel(CONTACT.emergencyPhone)} className="flex items-center justify-between rounded-2xl bg-subtle px-4 py-3 font-semibold">
                <span>📞 Ligne d&apos;urgence SURPLACE</span>
                <span className="text-sm text-muted">{CONTACT.emergencyPhone}</span>
              </a>
              <div className="grid grid-cols-2 gap-2">
                {EMERGENCY_NUMBERS.map((n) => (
                  <a key={n.phone} href={tel(n.phone)} className="rounded-2xl bg-subtle px-3 py-3 text-sm font-semibold">
                    {n.label}
                    <span className="block text-lg font-extrabold">{n.phone}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
