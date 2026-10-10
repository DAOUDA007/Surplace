"use client";

import { Fragment, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { formatDateTime, formatPhone } from "@/lib/format";
import { formatFcfa } from "@/lib/pricing";
import type { AdminPassenger, Ride } from "@/lib/types";
import { ActionButton, Card, EmptyState, FilterTabs, LoadingRows, PageError, PageHeader, SearchInput, TableWrap, td, th } from "./ui";

type Filter = "all" | "active" | "blocked";

function PassengerRides({ passengerId }: { passengerId: number }) {
  const { data } = useAdminData<{ rides: Ride[] }>(`/api/admin/rides?passengerId=${passengerId}`, 30_000);
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

export function PassengersPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (q) params.set("q", q);
  const { data, error, loading } = useAdminData<{ passengers: AdminPassenger[] }>(`/api/admin/passengers?${params}`);
  const action = useAdminAction();
  const passengers = data?.passengers ?? [];

  return (
    <>
      <PageHeader
        title="Passagers"
        subtitle="Consultez les clients. En cas d'abus, bloquez le compte (connexion impossible) ou supprimez-le. Un passager qui a déjà voyagé est anonymisé (ses courses restent dans l'historique)."
      />
      <PageError message={error || action.error} />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Tous" },
              { value: "active", label: "Actifs" },
              { value: "blocked", label: "Bloqués" },
            ]}
          />
          <SearchInput onSearch={setQ} placeholder="Nom, téléphone ou e-mail…" />
        </div>

        {loading && !data ? (
          <LoadingRows />
        ) : passengers.length === 0 ? (
          <EmptyState icon="🙋" title="Aucun passager" text="Aucun passager ne correspond à ces critères." />
        ) : (
          <TableWrap minWidth={820}>
            <thead>
              <tr>
                <th className={th}>Passager</th>
                <th className={th}>Inscrit le</th>
                <th className={th}>Courses</th>
                <th className={th}>Annulations</th>
                <th className={th}>Dépensé</th>
                <th className={th}>Dernière course</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {passengers.map((p) => (
                <Fragment key={p.id}>
                  <tr
                    className={`cursor-pointer hover:bg-subtle/60 ${p.blocked ? "opacity-60" : ""}`}
                    onClick={() => setOpen(open === p.id ? null : p.id)}
                  >
                    <td className={td}>
                      <p className="font-semibold">
                        {p.name}
                        {p.isGuest ? (
                          <span
                            className="ml-2 rounded-full bg-subtle px-2 py-0.5 text-xs text-muted"
                            title="A commandé sans créer de compte"
                          >
                            Invité
                          </span>
                        ) : null}
                        {p.blocked ? (
                          <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Bloqué</span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted">{formatPhone(p.phone)}</p>
                      {p.email && <p className="text-xs text-muted">{p.email}</p>}
                      {p.rating != null && (
                        <p className={`text-xs ${p.rating < 3 ? "font-semibold text-red-600" : "text-muted"}`} title="Note donnée par les chauffeurs">
                          ★ {p.rating.toFixed(1)} par les chauffeurs
                        </p>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className={td}>
                      {p.completedRides} terminée{p.completedRides > 1 ? "s" : ""}
                      <p className="text-xs text-muted">{p.totalRides} au total</p>
                    </td>
                    <td className={td}>
                      <span className={p.cancelledRides >= 3 ? "font-semibold text-red-600" : ""}>{p.cancelledRides}</span>
                    </td>
                    <td className={td}>{formatFcfa(p.totalSpent)}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {p.lastRideAt ? formatDateTime(p.lastRideAt) : <span className="text-muted">—</span>}
                    </td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      <span className="inline-flex flex-wrap justify-end gap-3">
                      {p.blocked ? (
                        <ActionButton
                          tone="success"
                          disabled={action.busy === `b-${p.id}`}
                          onClick={() => action.run(`b-${p.id}`, `/api/admin/passengers/${p.id}/block`, { blocked: false })}
                        >
                          Débloquer
                        </ActionButton>
                      ) : (
                        <ActionButton
                          tone="danger"
                          confirm="Confirmer le blocage"
                          disabled={action.busy === `b-${p.id}`}
                          onClick={() => action.run(`b-${p.id}`, `/api/admin/passengers/${p.id}/block`, { blocked: true })}
                        >
                          Bloquer
                        </ActionButton>
                      )}
                      <ActionButton
                        tone="danger"
                        confirm="Confirmer la suppression"
                        disabled={action.busy === `d-${p.id}`}
                        onClick={() => action.run(`d-${p.id}`, `/api/admin/passengers/${p.id}/delete`)}
                      >
                        Supprimer
                      </ActionButton>
                      </span>
                    </td>
                  </tr>
                  {open === p.id && (
                    <tr className="bg-subtle/60">
                      <td colSpan={7} className="px-3 py-4">
                        <p className="mb-2 text-xs font-bold uppercase text-muted">Dernières courses</p>
                        <PassengerRides passengerId={p.id} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
