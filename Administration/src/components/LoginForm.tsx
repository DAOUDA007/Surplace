"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorMessage } from "@/components/ui";
import { api } from "@/lib/api";

const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none transition focus:border-ink";

/** Connexion réservée aux administrateurs (le serveur refuse les autres comptes avec `space: "admin"`). */
export function LoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/auth/login", { phone, pin, space: "admin" });
      router.replace("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Numéro de téléphone</span>
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
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Code PIN</span>
        <input
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={4}
          required
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
          placeholder="••••"
          className={`${inputClass} tracking-[0.5em]`}
        />
      </label>
      <ErrorMessage>{error}</ErrorMessage>
      <Button type="submit" loading={loading} variant="dark" className="w-full">
        Se connecter
      </Button>
      <p className="text-center text-sm">
        <Link href="/pin-oublie" className="font-semibold text-brand">
          Code PIN oublié ?
        </Link>
      </p>
      <p className="text-center text-xs text-muted">
        Sans SMS : dans le dossier Backend, <code className="rounded bg-subtle px-1">npm run reset-admin-pin -- 4821</code>.
      </p>
    </form>
  );
}
