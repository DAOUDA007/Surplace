"use client";

import { Fragment, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { formatDateTime, formatPhone } from "@/lib/format";
import { formatFcfa, SUBSCRIPTION_PLANS } from "@/lib/pricing";
import type { AdminCounts, AdminDriver, Ride, SubscriptionPlanId } from "@/lib/types";
import { ActionButton, Card, EmptyState, FilterTabs, LoadingRows, PageError, PageHeader, SearchInput, TableWrap, td, th } from "./ui";

type Filter = "all" | "pending" | "approved" | "online" | "unsubscribed" | "suspended";

const STATUS = {
  pending: { label: "À valider", style: "bg-amber-100 text-amber-800" },
  approved: { label: "Validé", style: "bg-emerald-100 text-emerald-800" },
  suspended: { label: "Suspendu", style: "bg-red-100 text-red-700" },
};

const PLAN_IDS = Object.keys(SUBSCRIPTION_PLANS) as SubscriptionPlanId[];

function subscriptionState(until: string | null) {
  if (!until) return { active: false, text: "Aucun" };
  const active = new Date(until) > new Date();
  const date = new Date(until).toLocaleDateString("fr-FR");
  return { active, text: active ? `Jusqu'au ${date}` : `Expiré le ${date}` };
}

function DriverRides({ driverId }: { driverId: number }) {
  const { data } = useAdminData<{ rides: Ride[] }>(`/api/admin/rides?driverId=${driverId}`, 30_000);
  if (!data) return <p className="text-xs text-muted">Chargement…</p>;
  if (data.rides.length === 0) return <p className="text-xs text-muted">Aucune course pour le moment.</p>;
  return (
    <ul className="space-y-1 text-xs">
      {data.rides.slice(0, 8).map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-muted">{formatDateTime(r.requestedAt)}</span>
          <span className="min-w-0 flex-1 truncate">
            {r.pickup.label} → {r.dropoff.label}
          </span>
          <StatusBadge status={r.status} />
          <span className="w-20 text-right font-semibold">{formatFcfa(r.price)}</span>
        </li>
      ))}
    </ul>
  );
}

export function DriversPage({ initialFilter = "all" }: { initialFilter?: Filter }) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const [collecting, setCollecting] = useState<number | null>(null);
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (q) params.set("q", q);
  const { data, error, loading } = useAdminData<{ drivers: AdminDriver[] }>(`/api/admin/drivers?${params}`);
  const { data: counts } = useAdminData<AdminCounts>("/api/admin/counts");
  const action = useAdminAction();
  const drivers = data?.drivers ?? [];

  const setStatus = (id: number, status: "approved" | "suspended") =>
    action.run(`st-${id}`, `/api/admin/drivers/${id}`, { status });

  const collect = async (id: number, plan: SubscriptionPlanId) => {
    if (await action.run(`sub-${id}`, `/api/admin/drivers/${id}/subscription`, { plan })) setCollecting(null);
  };

  return (
    <>
      <PageHeader
        title="Chauffeurs"
        subtitle="Validez les inscriptions, gérez les abonnements, suspendez ou supprimez un compte qui ne respecte pas les règles. Un chauffeur qui a déjà roulé est anonymisé (ses courses restent dans l'historique)."
      />
      <PageError message={error || action.error} />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Tous" },
              { value: "pending", label: "À valider", count: counts?.driversPending },
              { value: "approved", label: "Validés" },
              { value: "online", label: "En ligne" },
              { value: "unsubscribed", label: "Sans abonnement" },
              { value: "suspended", label: "Suspendus" },
            ]}
          />
          <SearchInput onSearch={setQ} placeholder="Nom, téléphone, e-mail, plaque…" />
        </div>

        {loading && !data ? (
          <LoadingRows />
        ) : drivers.length === 0 ? (
          <EmptyState icon="🪪" title="Aucun chauffeur" text="Aucun chauffeur ne correspond à ces critères." />
        ) : (
          <TableWrap minWidth={1000}>
            <thead>
              <tr>
                <th className={th}>Chauffeur</th>
                <th className={th}>Moto</th>
                <th className={th}>Statut</th>
                <th className={th}>Activité</th>
                <th className={th}>Abonnement</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {drivers.map((d) => {
                const sub = subscriptionState(d.subscriptionUntil);
                return (
                  <Fragment key={d.id}>
                    <tr className="cursor-pointer hover:bg-subtle/60" onClick={() => setOpen(open === d.id ? null : d.id)}>
                      <td className={td}>
                        <p className="font-semibold">
                          {d.isOnline ? "🟢 " : ""}
                          {d.name}
                        </p>
                        <p className="text-xs text-muted">{formatPhone(d.phone)}</p>
                        {d.email && <p className="text-xs text-muted">{d.email}</p>}
                      </td>
                      <td className={td}>
                        {d.motoModel}
                        <p className="text-xs font-semibold">{d.plate}</p>
                      </td>
                      <td className={td}>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS[d.status].style}`}>
                          {STATUS[d.status].label}
                        </span>
                      </td>
                      <td className={td}>
                        {d.completedRides} course{d.completedRides > 1 ? "s" : ""}
                        <p className="text-xs text-muted">
                          {d.rating != null ? `★ ${d.rating} (${d.ratingCount})` : "Pas encore noté"}
                        </p>
                      </td>
                      <td className={td} onClick={(e) => e.stopPropagation()}>
                        <span className={sub.active ? "text-emerald-700" : "text-red-600"}>{sub.text}</span>
                        {collecting === d.id ? (
                          <span className="mt-1 flex flex-wrap items-center gap-1">
                            {PLAN_IDS.map((plan) => (
                              <button
                                key={plan}
                                onClick={() => collect(d.id, plan)}
                                disabled={action.busy === `sub-${d.id}`}
                                className="rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white disabled:opacity-50"
                              >
                                {SUBSCRIPTION_PLANS[plan].label} · {formatFcfa(SUBSCRIPTION_PLANS[plan].price)}
                              </button>
                            ))}
                            <button onClick={() => setCollecting(null)} className="px-1 text-xs text-muted">
                              Annuler
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setCollecting(d.id)}
                            className="block text-xs font-semibold text-brand hover:underline"
                          >
                            + Encaisser un abonnement
                          </button>
                        )}
                      </td>
                      <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                        <span className="inline-flex flex-wrap justify-end gap-3">
                          {d.status !== "approved" && (
                            <ActionButton
                              tone="success"
                              disabled={action.busy === `st-${d.id}`}
                              onClick={() => setStatus(d.id, "approved")}
                            >
                              {d.status === "pending" ? "Valider" : "Réactiver"}
                            </ActionButton>
                          )}
                          {d.status !== "suspended" && (
                            <ActionButton
                              tone="danger"
                              confirm={d.status === "pending" ? "Confirmer le refus" : "Confirmer la suspension"}
                              disabled={action.busy === `st-${d.id}`}
                              onClick={() => setStatus(d.id, "suspended")}
                            >
                              {d.status === "pending" ? "Refuser" : "Suspendre"}
                            </ActionButton>
                          )}
                          <ActionButton
                            tone="danger"
                            confirm="Confirmer la suppression"
                            disabled={action.busy === `del-${d.id}`}
                            onClick={() => action.run(`del-${d.id}`, `/api/admin/drivers/${d.id}/delete`)}
                          >
                            Supprimer
                          </ActionButton>
                        </span>
                      </td>
                    </tr>
                    {open === d.id && (
                      <tr className="bg-subtle/60">
                        <td colSpan={6} className="px-3 py-4">
                          <div className="grid gap-6 md:grid-cols-[220px_1fr]">
                            <div className="space-y-1 text-sm">
                              <p className="text-xs font-bold uppercase text-muted">Fiche</p>
                              <p>Inscrit le {formatDateTime(d.createdAt)}</p>
                              <p>Total gagné : {formatFcfa(d.earnings)}</p>
                              <p>{d.isOnline ? "🟢 En ligne" : "⚪ Hors ligne"}</p>
                            </div>
                            <div>
                              <p className="mb-2 text-xs font-bold uppercase text-muted">Dernières courses</p>
                              <DriverRides driverId={d.id} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
