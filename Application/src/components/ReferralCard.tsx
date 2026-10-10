"use client";

import { useState } from "react";
import { usePublicConfig } from "@/hooks/usePublicConfig";

/** Code de parrainage du chauffeur, à partager avec d'autres chauffeurs. */
export function ReferralCard({ code }: { code: string | null }) {
  const config = usePublicConfig();
  const [copied, setCopied] = useState(false);
  if (!code) return null;
  const days = config?.settings.referralDays ?? 7;
  const text = `Deviens chauffeur SURPLACE à Korhogo ! Inscris-toi avec mon code de parrainage ${code} : ${typeof window !== "undefined" ? window.location.origin : ""}/inscription?role=driver`;

  return (
    <section className="rounded-3xl bg-brand-soft p-5">
      <h2 className="text-lg font-extrabold">🎁 Parrainez des chauffeurs</h2>
      <p className="mt-1 text-sm text-muted">
        Quand un chauffeur inscrit avec votre code paie son premier abonnement, vous recevez{" "}
        <strong className="text-ink">{days} jours d&apos;abonnement offerts</strong>.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-2xl bg-surface px-4 py-2 font-mono text-xl font-extrabold tracking-widest">{code}</span>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard?.writeText(code).catch(() => null);
            setCopied(true);
          }}
          className="rounded-full bg-contrast px-3 py-2 text-xs font-semibold text-on-contrast"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(text)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-full bg-green-600 px-3 py-2 text-xs font-semibold text-white"
        >
          Partager sur WhatsApp
        </a>
      </div>
    </section>
  );
}
