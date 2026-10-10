"use client";

import { useEffect, useState } from "react";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { activeSurcharges, formatFcfa, priceFor } from "@/lib/pricing";
import type { AppSettings } from "@/lib/types";
import { Card, LoadingRows, PageError, PageHeader } from "./ui";

function NumberField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold">{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
        />
        {suffix && <span className="shrink-0 text-sm text-muted">{suffix}</span>}
      </span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Switch({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-2xl bg-subtle p-3">
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 accent-[var(--color-brand)]" />
    </label>
  );
}

/** Tarifs, majorations, abonnements, attribution des courses, parrainage et documents obligatoires. */
export function SettingsPage() {
  const { data, error, loading } = useAdminData<{ settings: AppSettings }>("/api/admin/settings", 300_000);
  const action = useAdminAction();
  const [s, setS] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (data && !s) setS(data.settings);
  }, [data, s]);

  if (loading && !s) return <LoadingRows />;
  if (!s) return <PageError message={error} />;

  const update = (fn: (draft: AppSettings) => void) => {
    const next = structuredClone(s);
    fn(next);
    setS(next);
    setSaved(false);
  };
  const surcharge = activeSurcharges(s);

  async function save() {
    setSaved(false);
    const ok = await action.run("save", "/api/admin/settings", { settings: s });
    if (ok) setSaved(true);
  }

  return (
    <>
      <PageHeader
        title="Tarifs et réglages"
        subtitle="Appliqués immédiatement à toutes les nouvelles commandes. Les courses déjà commandées gardent leur prix."
        actions={
          <button
            type="button"
            onClick={save}
            disabled={action.busy === "save"}
            className="rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {action.busy === "save" ? "Enregistrement…" : "Enregistrer"}
          </button>
        }
      />
      <PageError message={error || action.error} />
      {saved && <p className="mb-4 rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-800">✅ Réglages enregistrés.</p>}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="💰 Prix des courses">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Prix au kilomètre" value={s.pricing.perKm} suffix="FCFA" onChange={(v) => update((d) => (d.pricing.perKm = v))} />
            <NumberField label="Prix minimum" value={s.pricing.minimumFare} suffix="FCFA" onChange={(v) => update((d) => (d.pricing.minimumFare = v))} />
            <NumberField label="Prise en charge" value={s.pricing.baseFare} suffix="FCFA" onChange={(v) => update((d) => (d.pricing.baseFare = v))} hint="Ajoutée à chaque course (souvent 0)." />
            <NumberField label="Arrondi" value={s.pricing.roundTo} suffix="FCFA" onChange={(v) => update((d) => (d.pricing.roundTo = v))} hint="Prix arrondi au multiple supérieur." />
            <NumberField
              label="Facteur route"
              value={s.pricing.roadFactor}
              step={0.05}
              onChange={(v) => update((d) => (d.pricing.roadFactor = v))}
              hint="Sans itinéraire routier : distance à vol d'oiseau × ce facteur."
            />
            <NumberField label="Vitesse moyenne" value={s.pricing.averageSpeedKmh} suffix="km/h" onChange={(v) => update((d) => (d.pricing.averageSpeedKmh = v))} hint="Pour la durée estimée." />
          </div>
          <p className="mt-4 rounded-2xl bg-subtle p-3 text-sm">
            Exemples : 1 km → <strong>{formatFcfa(priceFor(1, s.pricing))}</strong> · 3 km → <strong>{formatFcfa(priceFor(3, s.pricing))}</strong> ·
            8 km → <strong>{formatFcfa(priceFor(8, s.pricing))}</strong>
          </p>
        </Card>

        <Card title="🌙 Majorations">
          <div className="space-y-3">
            <Switch
              label="Majoration de nuit"
              hint="Appliquée automatiquement aux heures indiquées (heure de Korhogo)."
              checked={s.surcharges.night.enabled}
              onChange={(v) => update((d) => (d.surcharges.night.enabled = v))}
            />
            <div className="grid grid-cols-3 gap-3">
              <NumberField label="De" value={s.surcharges.night.startHour} suffix="h" onChange={(v) => update((d) => (d.surcharges.night.startHour = v))} />
              <NumberField label="À" value={s.surcharges.night.endHour} suffix="h" onChange={(v) => update((d) => (d.surcharges.night.endHour = v))} />
              <NumberField label="Hausse" value={s.surcharges.night.percent} suffix="%" onChange={(v) => update((d) => (d.surcharges.night.percent = v))} />
            </div>
            <Switch
              label="🌧️ Majoration de pluie (activer pendant la pluie)"
              hint="À allumer et éteindre à la main quand il pleut."
              checked={s.surcharges.rain.active}
              onChange={(v) => update((d) => (d.surcharges.rain.active = v))}
            />
            <NumberField label="Hausse pendant la pluie" value={s.surcharges.rain.percent} suffix="%" onChange={(v) => update((d) => (d.surcharges.rain.percent = v))} />
            <p className={`rounded-2xl p-3 text-sm ${surcharge.percent ? "bg-amber-50 text-amber-800" : "bg-subtle text-muted"}`}>
              En ce moment : {surcharge.percent ? surcharge.labels.join(" + ") : "aucune majoration"}.
            </p>
          </div>
        </Card>

        <Card title="💳 Abonnements des chauffeurs">
          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField label="Mensuel" value={s.plans.monthly} suffix="FCFA" onChange={(v) => update((d) => (d.plans.monthly = v))} />
            <NumberField label="Annuel" value={s.plans.yearly} suffix="FCFA" onChange={(v) => update((d) => (d.plans.yearly = v))} />
            <NumberField
              label="Parrainage : jours offerts"
              value={s.referralDays}
              suffix="jours"
              onChange={(v) => update((d) => (d.referralDays = v))}
              hint="Au parrain, quand son filleul paie son premier abonnement. 0 = désactivé."
            />
          </div>
        </Card>

        <Card title="🏍️ Attribution des courses">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1 rounded-2xl bg-subtle p-1 text-sm font-semibold">
              {(["auto", "open"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => update((d) => (d.dispatch.mode = mode))}
                  className={`rounded-xl px-3 py-2 ${s.dispatch.mode === mode ? "bg-surface shadow-sm" : "text-muted"}`}
                >
                  {mode === "auto" ? "Au plus proche" : "Ouverte à tous"}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted">
              {s.dispatch.mode === "auto"
                ? "Chaque demande est proposée au chauffeur libre le plus proche, puis au suivant s'il refuse ou ne répond pas. Ensuite, elle est ouverte à tous."
                : "Chaque demande est visible tout de suite par tous les chauffeurs proches : le premier qui accepte la prend."}
            </p>
            {s.dispatch.mode === "auto" && (
              <div className="grid grid-cols-2 gap-3">
                <NumberField label="Temps pour répondre" value={s.dispatch.offerSeconds} suffix="s" onChange={(v) => update((d) => (d.dispatch.offerSeconds = v))} />
                <NumberField label="Chauffeurs sollicités" value={s.dispatch.maxOffers} onChange={(v) => update((d) => (d.dispatch.maxOffers = v))} hint="Avant d'ouvrir à tous." />
              </div>
            )}
            <Switch
              label="📄 Documents obligatoires"
              hint="Un chauffeur sans photo, permis, carte grise et pièce d'identité valides ne peut pas passer en ligne."
              checked={s.documentsRequired}
              onChange={(v) => update((d) => (d.documentsRequired = v))}
            />
          </div>
        </Card>
      </div>
    </>
  );
}
