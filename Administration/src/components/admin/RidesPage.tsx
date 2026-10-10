"use client";

import { Fragment, useState } from "react";
import { StatusBadge } from "@/components/ui";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { formatDateTime, formatPhone } from "@/lib/format";
import { formatFcfa } from "@/lib/pricing";
import type { Ride } from "@/lib/types";
import { ActionButton, Card, EmptyState, FilterTabs, LoadingRows, PageError, PageHeader, SearchInput, TableWrap, td, th } from "./ui";

type Filter = "all" | "active" | "completed" | "cancelled";

const CANCELLED_BY: Record<string, string> = {
  passenger: "par le passager",
  admin: "par l'administration",
  timeout: "aucun chauffeur disponible",
};

const ACTIVE = ["requested", "accepted", "arrived", "in_progress"];

function Timeline({ ride }: { ride: Ride }) {
  const steps = [
    ["Demandée", ride.requestedAt],
    ["Acceptée", ride.acceptedAt],
    ["Chauffeur arrivé", ride.arrivedAt],
    ["Démarrée", ride.startedAt],
    ["Terminée", ride.completedAt],
    ["Annulée", ride.cancelledAt],
  ].filter(([, at]) => at) as [string, string][];
  return (
    <ol className="space-y-1 text-xs">
      {steps.map(([label, at]) => (
        <li key={label} className="flex gap-2">
          <span className="w-28 text-muted">{label}</span>
          <span>{formatDateTime(at)}</span>
        </li>
      ))}
    </ol>
  );
}

export function RidesPage({ initialFilter = "all" }: { initialFilter?: Filter }) {
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<number | null>(null);
  const params = new URLSearchParams();
  if (filter !== "all") params.set("status", filter);
  if (q) params.set("q", q);
  const { data, error, loading } = useAdminData<{ rides: Ride[] }>(`/api/admin/rides?${params}`, 10_000);
  const action = useAdminAction();
  const rides = data?.rides ?? [];

  return (
    <>
      <PageHeader title="Courses" subtitle="Suivez toutes les courses et intervenez si une course est bloquée." />
      <PageError message={error || action.error} />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Toutes" },
              { value: "active", label: "En cours" },
              { value: "completed", label: "Terminées" },
              { value: "cancelled", label: "Annulées" },
            ]}
          />
          <SearchInput onSearch={setQ} placeholder="N°, nom, téléphone, lieu…" />
        </div>

        {loading && !data ? (
          <LoadingRows />
        ) : rides.length === 0 ? (
          <EmptyState icon="🏍️" title="Aucune course" text="Aucune course ne correspond à ces critères." />
        ) : (
          <TableWrap minWidth={900}>
            <thead>
              <tr>
                <th className={th}>N°</th>
                <th className={th}>Date</th>
                <th className={th}>Trajet</th>
                <th className={th}>Passager</th>
                <th className={th}>Chauffeur</th>
                <th className={th}>Statut</th>
                <th className={`${th} text-right`}>Prix</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rides.map((r) => (
                <Fragment key={r.id}>
                  <tr className="cursor-pointer hover:bg-subtle/60" onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <td className={`${td} text-muted`}>#{r.id}</td>
                    <td className={`${td} whitespace-nowrap`}>{formatDateTime(r.requestedAt)}</td>
                    <td className={`${td} max-w-64`}>
                      <p className="truncate">{r.pickup.label}</p>
                      <p className="truncate text-muted">→ {r.dropoff.label}</p>
                    </td>
                    <td className={td}>{r.passenger.name}</td>
                    <td className={td}>{r.driver?.name ?? <span className="text-muted">—</span>}</td>
                    <td className={td}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={`${td} text-right font-semibold`}>{formatFcfa(r.price)}</td>
                    <td className={`${td} text-right`} onClick={(e) => e.stopPropagation()}>
                      {ACTIVE.includes(r.status) ? (
                        <ActionButton
                          tone="danger"
                          confirm="Confirmer l'annulation"
                          disabled={action.busy === `c-${r.id}`}
                          onClick={() => action.run(`c-${r.id}`, `/api/admin/rides/${r.id}/cancel`)}
                        >
                          Annuler
                        </ActionButton>
                      ) : (
                        <ActionButton
                          tone="danger"
                          confirm="Confirmer la suppression"
                          disabled={action.busy === `d-${r.id}`}
                          onClick={() => action.run(`d-${r.id}`, `/api/admin/rides/${r.id}/delete`)}
                        >
                          Supprimer
                        </ActionButton>
                      )}
                    </td>
                  </tr>
                  {open === r.id && (
                    <tr className="bg-subtle/60">
                      <td colSpan={8} className="px-3 py-4">
                        <div className="grid gap-6 md:grid-cols-3">
                          <div>
                            <p className="mb-2 text-xs font-bold uppercase text-muted">Déroulement</p>
                            <Timeline ride={r} />
                            {r.cancelledBy && (
                              <p className="mt-2 text-xs text-red-600">
                                Annulée {CANCELLED_BY[r.cancelledBy] ?? ""}
                              </p>
                            )}
                          </div>
                          <div className="text-sm">
                            <p className="mb-2 text-xs font-bold uppercase text-muted">Contacts</p>
                            <p>
                              🙋 {r.passenger.name} · {formatPhone(r.passenger.phone)}
                            </p>
                            {r.driver && (
                              <p>
                                🏍️ {r.driver.name} · {formatPhone(r.driver.phone)} · {r.driver.plate}
                              </p>
                            )}
                            <p className="mt-2 text-muted">
                              {r.distanceKm.toLocaleString("fr-FR")} km · paiement en espèces
                            </p>
                          </div>
                          <div className="text-sm">
                            <p className="mb-2 text-xs font-bold uppercase text-muted">Avis du passager</p>
                            {r.rating ? (
                              <>
                                <p className="text-amber-500">{"★".repeat(r.rating)}</p>
                                {r.comment && <p>« {r.comment} »</p>}
                              </>
                            ) : (
                              <p className="text-muted">Pas de note</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </TableWrap>
        )}
        {rides.length >= 200 && (
          <p className="mt-3 text-xs text-muted">Seules les 200 dernières courses sont affichées : affinez la recherche.</p>
        )}
      </Card>
    </>
  );
}
