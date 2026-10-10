"use client";
// ⚠️ Fichier copié depuis Commun/components/OtpField.tsx par scripts/sync-commun.mjs : modifiez l'original dans Commun/.

import { useEffect, useState } from "react";
import { api } from "@/lib/api";

const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none transition focus:border-ink";

type Purpose = "register" | "guest" | "reset" | "phone";

/**
 * Code de vérification reçu par SMS : bouton « Recevoir le code », puis champ à 6 chiffres.
 * En développement, aucun SMS ne part : le code est affiché ici pour pouvoir tester.
 */
export function OtpField({
  phone,
  purpose,
  value,
  onChange,
  label = "Code reçu par SMS",
}: {
  phone: string;
  purpose: Purpose;
  value: string;
  onChange: (code: string) => void;
  label?: string;
}) {
  const [sentTo, setSentTo] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const digits = phone.replace(/\D/g, "");
  const changedNumber = sentTo && sentTo !== digits;

  async function send() {
    setError("");
    setLoading(true);
    try {
      const res = await api<{ sent: boolean; devCode?: string }>("/api/otp", { phone, purpose });
      setSentTo(digits);
      setDevCode(res.devCode ?? "");
      setWait(60);
      onChange("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded-2xl bg-subtle p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold">{label}</span>
        <button
          type="button"
          onClick={send}
          disabled={loading || wait > 0 || digits.length < 10}
          className="shrink-0 rounded-full bg-contrast px-3 py-1.5 text-xs font-semibold text-on-contrast disabled:opacity-50"
        >
          {loading ? "Envoi…" : wait > 0 ? `Renvoyer (${wait} s)` : sentTo ? "Renvoyer le code" : "Recevoir le code"}
        </button>
      </div>
      {sentTo && !changedNumber && (
        <>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6 chiffres"
            className={`${inputClass} text-center tracking-[0.4em]`}
          />
          <p className="text-xs text-muted">Code envoyé au {sentTo.replace(/(\d{2})(?=\d)/g, "$1 ")}, valable 10 minutes.</p>
          {devCode && (
            <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Mode test (aucun SMS n&apos;est envoyé) : le code est <strong>{devCode}</strong>.
            </p>
          )}
        </>
      )}
      {changedNumber && <p className="text-xs text-amber-800">Numéro modifié : demandez un nouveau code.</p>}
      {!sentTo && <p className="text-xs text-muted">Pour vérifier que ce numéro est bien le vôtre.</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
