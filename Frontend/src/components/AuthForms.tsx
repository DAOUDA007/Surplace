"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorMessage } from "@/components/ui";
import { api } from "@/lib/api";

const inputClass =
  "h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none transition focus:border-ink";

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function PinInput(props: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      type="password"
      inputMode="numeric"
      autoComplete="current-password"
      maxLength={4}
      required
      value={props.value}
      onChange={(e) => props.onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
      placeholder="••••"
      className={`${inputClass} tracking-[0.5em]`}
    />
  );
}

function useSubmit() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(path: string, body: unknown) {
    setError("");
    setLoading(true);
    try {
      const { redirect } = await api<{ redirect: string }>(path, body);
      router.replace(redirect);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }
  return { submit, error, loading };
}

export function LoginForm() {
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const { submit, error, loading } = useSubmit();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit("/api/auth/login", { phone, pin });
      }}
    >
      <Field label="Numéro de téléphone">
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
      </Field>
      <Field label="Code PIN">
        <PinInput value={pin} onChange={setPin} />
      </Field>
      <ErrorMessage>{error}</ErrorMessage>
      <Button type="submit" loading={loading} className="w-full">
        Se connecter
      </Button>
      <p className="text-center text-sm text-muted">
        Pas encore de compte ?{" "}
        <Link href="/inscription" className="font-semibold text-brand">
          S&apos;inscrire
        </Link>
      </p>
    </form>
  );
}

export function RegisterForm({ initialRole }: { initialRole: "passenger" | "driver" }) {
  const [role, setRole] = useState(initialRole);
  const [form, setForm] = useState({ name: "", phone: "", email: "", pin: "", plate: "", motoModel: "" });
  const { submit, error, loading } = useSubmit();
  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit("/api/auth/register", { ...form, role });
      }}
    >
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-subtle p-1">
        {(
          [
            ["passenger", "🙋 Passager"],
            ["driver", "🏍️ Chauffeur"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setRole(value)}
            className={`h-11 rounded-xl text-sm font-semibold transition ${
              role === value ? "bg-surface shadow-sm" : "text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Field label="Nom complet">
        <input
          required
          autoComplete="name"
          value={form.name}
          onChange={(e) => set("name")(e.target.value)}
          placeholder="Ex. Awa Koné"
          className={inputClass}
        />
      </Field>
      <Field label="Numéro de téléphone">
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          required
          value={form.phone}
          onChange={(e) => set("phone")(e.target.value)}
          placeholder="07 00 00 00 00"
          className={inputClass}
        />
      </Field>
      <Field label="Adresse e-mail (facultatif)" hint="Pour recevoir votre message de bienvenue et les informations de SURPLACE.">
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={form.email}
          onChange={(e) => set("email")(e.target.value)}
          placeholder="nom@exemple.com"
          className={inputClass}
        />
      </Field>
      <Field label="Choisissez un code PIN" hint="4 chiffres, pour vous connecter.">
        <PinInput value={form.pin} onChange={set("pin")} />
      </Field>

      {role === "driver" && (
        <div className="space-y-4 rounded-2xl bg-brand-soft p-4">
          <p className="text-sm font-semibold">Votre moto</p>
          <Field label="Immatriculation">
            <input
              required
              value={form.plate}
              onChange={(e) => set("plate")(e.target.value.toUpperCase())}
              placeholder="Ex. AB 1234 CI"
              className={inputClass}
            />
          </Field>
          <Field label="Marque et modèle">
            <input
              required
              value={form.motoModel}
              onChange={(e) => set("motoModel")(e.target.value)}
              placeholder="Ex. Haojue 125"
              className={inputClass}
            />
          </Field>
          <p className="text-xs text-muted">
            Votre compte sera vérifié par l&apos;équipe SURPLACE avant de pouvoir recevoir des courses.
          </p>
        </div>
      )}

      <ErrorMessage>{error}</ErrorMessage>
      <Button type="submit" loading={loading} className="w-full">
        Créer mon compte
      </Button>
      <p className="text-center text-sm text-muted">
        Déjà inscrit ?{" "}
        <Link href="/connexion" className="font-semibold text-brand">
          Se connecter
        </Link>
      </p>
    </form>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-1 mb-6 text-muted">{subtitle}</p>
      {children}
    </div>
  );
}
