"use client";

import { useState } from "react";
import { Button, ErrorMessage } from "@/components/ui";
import { api } from "@/lib/api";
import { formatFcfa, SUBSCRIPTION_PLANS } from "@/lib/pricing";
import { CONTACT } from "@/lib/site";
import type { DriverSubscription, SubscriptionPlanId } from "@/lib/types";

const PLAN_IDS = Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanId[];

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

/** Économie de la formule annuelle par rapport à 12 mois payés séparément. */
const YEARLY_SAVING = SUBSCRIPTION_PLANS.monthly.price * 12 - SUBSCRIPTION_PLANS.yearly.price;

export function SubscriptionPanel({
  subscription,
  onChange,
  onClose,
}: {
  subscription: DriverSubscription;
  onChange: (s: DriverSubscription) => void;
  onClose?: () => void;
}) {
  const [selected, setSelected] = useState<SubscriptionPlanId>("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { active, until, daysLeft, pending, history } = subscription;

  async function call(path: string, body: unknown) {
    setBusy(true);
    setError("");
    try {
      onChange(await api<DriverSubscription>(path, body));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-lg font-extrabold">Mon abonnement</p>
          <p className="text-sm text-muted">Gardez 100 % du prix de vos courses.</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-sm font-semibold text-muted hover:text-ink">
            Fermer
          </button>
        )}
      </div>

      <div
        className={`rounded-2xl p-4 ${active ? "bg-emerald-100 text-emerald-800" : "bg-amber-50 text-amber-800"}`}
      >
        {active ? (
          <>
            <p className="font-bold">✅ Abonnement actif</p>
            <p className="text-sm">
              Jusqu&apos;au {formatDate(until!)} · {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant
              {daysLeft > 1 ? "s" : ""}
            </p>
          </>
        ) : (
          <>
            <p className="font-bold">{until ? "⚠️ Abonnement expiré" : "Aucun abonnement"}</p>
            <p className="text-sm">
              {until ? `Expiré le ${formatDate(until)}. ` : ""}Abonnez-vous pour passer en ligne et recevoir des
              courses.
            </p>
          </>
        )}
      </div>

      {pending ? (
        <div className="space-y-3 rounded-2xl border-2 border-dashed border-brand p-4">
          <p className="font-bold">
            Demande en attente : {SUBSCRIPTION_PLANS[pending.plan].label} · {formatFcfa(pending.amount)}
          </p>
          <p className="text-sm text-muted">
            Réglez {formatFcfa(pending.amount)} à SURPLACE (espèces ou Mobile Money au{" "}
            <span className="font-semibold text-ink">{CONTACT.phone}</span>). Votre abonnement sera activé dès que
            l&apos;équipe aura confirmé votre paiement.
          </p>
          <Button variant="ghost" loading={busy} onClick={() => call("/api/driver/subscription/cancel", {})} className="w-full">
            Annuler la demande
          </Button>
        </div>
      ) : (
        <>
          <p className="text-sm font-semibold">{active ? "Prolonger mon abonnement" : "Choisir une formule"}</p>
          <div className="grid grid-cols-2 gap-3">
            {PLAN_IDS.map((id) => {
              const plan = SUBSCRIPTION_PLANS[id];
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
                  className={`relative rounded-2xl border-2 p-4 text-left transition ${
                    selected === id ? "border-brand bg-brand-soft" : "border-line"
                  }`}
                >
                  {id === "yearly" && (
                    <span className="absolute -top-2.5 right-3 rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
                      −{formatFcfa(YEARLY_SAVING)}
                    </span>
                  )}
                  <p className="text-sm font-semibold text-muted">{plan.label}</p>
                  <p className="text-xl font-extrabold">{formatFcfa(plan.price)}</p>
                  <p className="text-xs text-muted">{id === "monthly" ? "par mois" : "par an"}</p>
                </button>
              );
            })}
          </div>
          {active && (
            <p className="text-xs text-muted">La nouvelle période s&apos;ajoute à la fin de votre abonnement actuel.</p>
          )}
          <Button
            loading={busy}
            onClick={() => call("/api/driver/subscription", { plan: selected })}
            className="w-full"
          >
            Demander l&apos;abonnement {SUBSCRIPTION_PLANS[selected].label.toLowerCase()}
          </Button>
        </>
      )}

      <ErrorMessage>{error}</ErrorMessage>

      {history.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Paiements</p>
          <ul className="divide-y divide-line text-sm">
            {history.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2">
                <span>
                  {SUBSCRIPTION_PLANS[h.plan].label}
                  <span className="block text-xs text-muted">
                    {h.startsAt && h.endsAt ? `${formatDate(h.startsAt)} → ${formatDate(h.endsAt)}` : ""}
                  </span>
                </span>
                <span className="font-semibold">{formatFcfa(h.amount)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
