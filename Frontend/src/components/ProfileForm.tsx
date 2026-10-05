"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorMessage } from "@/components/ui";
import { api } from "@/lib/api";
import type { DriverProfile, User } from "@/lib/types";

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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <h2 className="mb-4 text-lg font-extrabold">{title}</h2>
      {children}
    </section>
  );
}

/** Informations personnelles (et véhicule pour un chauffeur). */
export function ProfileInfoForm({ user, driver }: { user: User; driver?: DriverProfile | null }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone,
    email: user.email ?? "",
    plate: driver?.plate ?? "",
    motoModel: driver?.motoModel ?? "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: k === "plate" ? e.target.value.toUpperCase() : e.target.value }));

  const vehicleChanged = !!driver && (form.plate.trim() !== driver.plate || form.motoModel.trim() !== driver.motoModel);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const { revalidation } = await api<{ revalidation: boolean }>("/api/me/profile", form);
      setSuccess(
        revalidation
          ? "Profil enregistré. Votre nouveau véhicule doit être vérifié par SURPLACE : votre compte est en attente de validation."
          : "✅ Profil enregistré.",
      );
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Mes informations">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nom complet">
          <input required value={form.name} onChange={set("name")} className={inputClass} />
        </Field>
        <Field label="Numéro de téléphone" hint="C'est aussi votre identifiant de connexion.">
          <input required type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} className={inputClass} />
        </Field>
        <Field label="Adresse e-mail (facultatif)">
          <input
            type="email"
            inputMode="email"
            value={form.email}
            onChange={set("email")}
            placeholder="nom@exemple.com"
            className={inputClass}
          />
        </Field>
        {driver && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Immatriculation">
              <input required value={form.plate} onChange={set("plate")} className={inputClass} />
            </Field>
            <Field label="Marque et modèle">
              <input required value={form.motoModel} onChange={set("motoModel")} className={inputClass} />
            </Field>
          </div>
        )}
        {vehicleChanged && driver?.status === "approved" && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
            ⚠️ En changeant de véhicule, votre compte repassera en validation : vous ne pourrez plus passer en ligne
            jusqu&apos;à ce que l&apos;équipe SURPLACE ait vérifié votre nouvelle moto.
          </p>
        )}
        <ErrorMessage>{error}</ErrorMessage>
        {success && <p className="rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-800">{success}</p>}
        <Button type="submit" loading={loading}>
          Enregistrer
        </Button>
      </form>
    </Section>
  );
}

const pinClass = `${inputClass} tracking-[0.5em]`;

export function PinForm() {
  const [form, setForm] = useState({ currentPin: "", newPin: "", confirmPin: "" });
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value.replace(/\D/g, "").slice(0, 4) }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDone(false);
    if (form.newPin !== form.confirmPin) {
      setError("Les deux nouveaux codes PIN ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      await api("/api/me/pin", { currentPin: form.currentPin, newPin: form.newPin });
      setDone(true);
      setForm({ currentPin: "", newPin: "", confirmPin: "" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title="Changer mon code PIN">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Code PIN actuel">
          <input type="password" inputMode="numeric" required value={form.currentPin} onChange={set("currentPin")} className={pinClass} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nouveau code PIN">
            <input type="password" inputMode="numeric" required value={form.newPin} onChange={set("newPin")} className={pinClass} />
          </Field>
          <Field label="Confirmer">
            <input type="password" inputMode="numeric" required value={form.confirmPin} onChange={set("confirmPin")} className={pinClass} />
          </Field>
        </div>
        <ErrorMessage>{error}</ErrorMessage>
        {done && <p className="rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-800">✅ Code PIN modifié.</p>}
        <Button type="submit" loading={loading} variant="dark">
          Modifier le code PIN
        </Button>
      </form>
    </Section>
  );
}
