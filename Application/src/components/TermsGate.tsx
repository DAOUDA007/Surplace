"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorMessage } from "@/components/ui";
import { api } from "@/lib/api";
import type { User } from "@/lib/types";

/**
 * Écran bloquant : un passager ou un chauffeur qui n'a pas accepté la version en vigueur des conditions
 * d'utilisation (inscrit avant leur mise en place, ou texte modifié depuis) doit les accepter pour continuer.
 * Le serveur refuse de toute façon les commandes et la mise en ligne tant que ce n'est pas fait.
 */
export function TermsGate({ user }: { user: User | null }) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!user || user.role === "admin" || user.termsAccepted || accepted) return null;

  async function accept() {
    setBusy(true);
    setError("");
    try {
      await api("/api/me/terms", { acceptTerms: true });
      setAccepted(true);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  async function refuse() {
    await api("/api/auth/logout", {}).catch(() => null);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="animate-fade-in fixed inset-0 z-[3000] flex items-end justify-center bg-black/60 p-3 md:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        className="sheet-in w-full max-w-md space-y-4 rounded-3xl bg-surface p-6 shadow-2xl"
      >
        <div>
          <h2 id="terms-title" className="text-xl font-extrabold">
            Conditions d&apos;utilisation
          </h2>
          <p className="mt-2 text-sm text-muted">
            Pour continuer à utiliser SURPLACE, lisez et acceptez nos conditions d&apos;utilisation et notre politique de
            confidentialité. Elles expliquent les règles du service et la façon dont vos données (numéro, courses,
            localisation) sont utilisées.
          </p>
        </div>
        <div className="grid gap-2 text-sm font-semibold">
          <Link href="/conditions" target="_blank" className="rounded-2xl bg-subtle px-4 py-3 transition hover:bg-line">
            Lire les conditions d&apos;utilisation
          </Link>
          <Link href="/confidentialite" target="_blank" className="rounded-2xl bg-subtle px-4 py-3 transition hover:bg-line">
            Lire la politique de confidentialité
          </Link>
        </div>
        <TermsCheckbox checked={checked} onChange={setChecked} />
        <ErrorMessage>{error}</ErrorMessage>
        <Button onClick={accept} loading={busy} disabled={!checked} className="w-full">
          Accepter et continuer
        </Button>
        <button type="button" onClick={refuse} className="w-full text-center text-sm font-semibold text-muted hover:text-ink">
          Refuser et me déconnecter
        </button>
      </div>
    </div>
  );
}

/** Case à cocher obligatoire, avec les liens vers les deux textes (ouverts dans un nouvel onglet). */
export function TermsCheckbox({
  checked,
  onChange,
  required,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  required?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-subtle p-3 text-sm">
      <input
        type="checkbox"
        required={required}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-brand)]"
      />
      <span>
        J&apos;ai lu et j&apos;accepte les{" "}
        <Link href="/conditions" target="_blank" className="font-semibold text-brand underline">
          conditions d&apos;utilisation
        </Link>{" "}
        et la{" "}
        <Link href="/confidentialite" target="_blank" className="font-semibold text-brand underline">
          politique de confidentialité
        </Link>
        .
      </span>
    </label>
  );
}
