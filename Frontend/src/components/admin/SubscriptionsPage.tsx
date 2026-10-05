"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { formatDateTime, formatPhone } from "@/lib/format";
import { formatFcfa, SUBSCRIPTION_PLANS } from "@/lib/pricing";
import type { AdminSubscription, SubscriptionStats } from "@/lib/types";
import { ActionButton, Card, EmptyState, LoadingRows, PageError, PageHeader, StatTile, TableWrap, td, th } from "./ui";

export function SubscriptionsPage() {
  const { data, error, loading } = useAdminData<{ stats: SubscriptionStats; subscriptions: AdminSubscription[] }>(
    "/api/admin/subscriptions",
  );
  const action = useAdminAction();
  const [q, setQ] = useState("");

  if (loading && !data) return <LoadingRows />;
  if (!data) return <PageError message={error} />;

  const pending = data.subscriptions.filter((s) => s.status === "pending");
  const needle = q.trim().toLowerCase();
  const paid = data.subscriptions.filter(
    (s) => s.status === "paid" && (!needle || s.driverName.toLowerCase().includes(needle) || s.driverPhone.includes(needle)),
  );
  const review = (id: number, approve: boolean) =>
    action.run(`s-${id}`, `/api/admin/subscriptions/${id}`, { approve });

  return (
    <>
      <PageHeader
        title="Abonnements"
        subtitle={`Formules : ${Object.values(SUBSCRIPTION_PLANS)
          .map((p) => `${p.label} ${formatFcfa(p.price)}`)
          .join(" · ")}. Pour encaisser sans demande, passez par la page Chauffeurs.`}
      />
      <PageError message={error || action.error} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Encaissé ce mois" value={formatFcfa(data.stats.subscriptionRevenueMonth)} />
        <StatTile label="Encaissé au total" value={formatFcfa(data.stats.subscriptionRevenueTotal)} />
        <StatTile label="Chauffeurs abonnés" value={data.stats.activeSubscribers} />
        <StatTile label="Paiements à confirmer" value={pending.length} highlight={pending.length > 0} />
      </div>

      <Card title="Demandes en attente de paiement" className="mt-6">
        <p className="-mt-2 mb-4 text-xs text-muted">
          Confirmez une demande quand le chauffeur a payé (espèces ou Mobile Money) : son abonnement s&apos;active
          aussitôt.
        </p>
        {pending.length === 0 ? (
          <EmptyState icon="✅" title="Aucune demande en attente" />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((s) => (
              <li key={s.id} className="rounded-2xl bg-brand-soft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{s.driverName}</p>
                    <p className="text-sm text-muted">{formatPhone(s.driverPhone)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold">{formatFcfa(s.amount)}</p>
                    <p className="text-xs text-muted">{SUBSCRIPTION_PLANS[s.plan].label}</p>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">Demandé le {formatDateTime(s.requestedAt)}</p>
                <div className="mt-3 flex items-center gap-3">
                  <Button className="h-10 flex-1 text-sm" loading={action.busy === `s-${s.id}`} onClick={() => review(s.id, true)}>
                    Paiement reçu
                  </Button>
                  <ActionButton tone="danger" confirm="Confirmer le refus" onClick={() => review(s.id, false)}>
                    Refuser
                  </ActionButton>
                  <ActionButton
                    tone="danger"
                    confirm="Confirmer la suppression"
                    onClick={() => action.run(`d-${s.id}`, `/api/admin/subscriptions/${s.id}/delete`)}
                  >
                    Supprimer
                  </ActionButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Historique des paiements"
        className="mt-6"
        action={
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 Chauffeur…"
            className="h-9 w-44 rounded-2xl border border-line bg-surface px-3 text-sm outline-none focus:border-ink"
          />
        }
      >
        {paid.length === 0 ? (
          <EmptyState icon="💳" title="Aucun paiement" />
        ) : (
          <TableWrap minWidth={760}>
            <thead>
              <tr>
                <th className={th}>Payé le</th>
                <th className={th}>Chauffeur</th>
                <th className={th}>Formule</th>
                <th className={th}>Valable jusqu&apos;au</th>
                <th className={`${th} text-right`}>Montant</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {paid.map((s) => (
                <tr key={s.id}>
                  <td className={`${td} whitespace-nowrap`}>{s.paidAt ? formatDateTime(s.paidAt) : "—"}</td>
                  <td className={td}>
                    {s.driverName}
                    <p className="text-xs text-muted">{formatPhone(s.driverPhone)}</p>
                  </td>
                  <td className={td}>{SUBSCRIPTION_PLANS[s.plan].label}</td>
                  <td className={td}>{s.endsAt ? new Date(s.endsAt).toLocaleDateString("fr-FR") : "—"}</td>
                  <td className={`${td} text-right font-semibold`}>{formatFcfa(s.amount)}</td>
                  <td className={`${td} text-right`}>
                    <ActionButton
                      tone="danger"
                      confirm="Retirer ce paiement ?"
                      disabled={action.busy === `d-${s.id}`}
                      onClick={() => action.run(`d-${s.id}`, `/api/admin/subscriptions/${s.id}/delete`)}
                    >
                      Supprimer
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
        <p className="mt-3 text-xs text-muted">
          Supprimer un paiement (erreur de saisie, fraude…) retire sa durée de l&apos;abonnement du chauffeur.
        </p>
      </Card>
    </>
  );
}
