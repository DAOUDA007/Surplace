"use client";
// ⚠️ Fichier copié depuis Commun/components/PinResetForm.tsx par scripts/sync-commun.mjs : modifiez l'original dans Commun/.

import Link from "next/link";
import { useState } from "react";
import { OtpField } from "@/components/OtpField";
import { Button, ErrorMessage } from "@/components/ui";
import { usePublicConfig } from "@/hooks/usePublicConfig";
import { api } from "@/lib/api";

const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none transition focus:border-ink";

/** « Code PIN oublié » : numéro → code SMS → nouveau code PIN. */
export function PinResetForm({ loginHref = "/connexion" }: { loginHref?: string }) {
  const config = usePublicConfig();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  if (config && !config.otpRequired) {
    return (
      <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-800">
        La réinitialisation par SMS n&apos;est pas encore disponible. Contactez SURPLACE pour obtenir un nouveau code PIN.
      </p>
    );
  }

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-4xl">✅</p>
        <p className="font-semibold">Votre nouveau code PIN est enregistré.</p>
        <Link href={loginHref} className="inline-flex h-12 items-center rounded-2xl bg-brand px-6 font-semibold text-white">
          Se connecter
        </Link>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (pin !== confirm) {
      setError("Les deux codes PIN ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/auth/reset-pin", { phone, code, pin });
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const pinInput = (value: string, set: (v: string) => void, label: string) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        maxLength={4}
        required
        value={value}
        onChange={(e) => set(e.target.value.replace(/\D/g, "").slice(0, 4))}
        placeholder="••••"
        className={`${inputClass} tracking-[0.5em]`}
      />
    </label>
  );

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Votre numéro de téléphone</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="07 00 00 00 00"
          className={inputClass}
        />
      </label>
      <OtpField phone={phone} purpose="reset" value={code} onChange={setCode} />
      <div className="grid grid-cols-2 gap-3">
        {pinInput(pin, setPin, "Nouveau code PIN")}
        {pinInput(confirm, setConfirm, "Confirmer")}
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      <Button type="submit" loading={loading} disabled={code.length !== 6} className="w-full">
        Enregistrer le nouveau code PIN
      </Button>
      <p className="text-center text-sm text-muted">
        <Link href={loginHref} className="font-semibold text-brand">
          ← Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
