"use client";

import { useState } from "react";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { formatDateTime } from "@/lib/format";
import type { AdminReview } from "@/lib/types";
import { ActionButton, Card, EmptyState, FilterTabs, LoadingRows, PageError, PageHeader, StatTile } from "./ui";

type Filter = "all" | "visible" | "hidden" | "low";

export function ReviewsPage() {
  const { data, error, loading } = useAdminData<{ reviews: AdminReview[] }>("/api/admin/reviews");
  const action = useAdminAction();
  const [filter, setFilter] = useState<Filter>("all");

  if (loading && !data) return <LoadingRows />;
  if (!data) return <PageError message={error} />;

  const all = data.reviews;
  const reviews = all.filter((r) =>
    filter === "visible" ? !r.hidden : filter === "hidden" ? !!r.hidden : filter === "low" ? r.rating <= 2 : true,
  );
  const average = all.length ? all.reduce((s, r) => s + r.rating, 0) / all.length : null;

  return (
    <>
      <PageHeader
        title="Avis"
        subtitle="Les avis visibles apparaissent sur la page d'accueil. Masquez un avis pour le retirer du site, ou supprimez-le (note comprise) s'il ne respecte pas les règles."
      />
      <PageError message={error || action.error} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Avis avec commentaire" value={all.length} />
        <StatTile label="Note moyenne" value={average != null ? `${average.toFixed(1)} / 5` : "—"} />
        <StatTile label="Avis masqués" value={all.filter((r) => r.hidden).length} />
        <StatTile
          label="Avis négatifs (≤ 2★)"
          value={all.filter((r) => r.rating <= 2).length}
          highlight={all.some((r) => r.rating <= 2 && !r.hidden)}
        />
      </div>

      <Card className="mt-6">
        <div className="mb-4">
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "all", label: "Tous" },
              { value: "visible", label: "Visibles" },
              { value: "hidden", label: "Masqués" },
              { value: "low", label: "Négatifs" },
            ]}
          />
        </div>
        {reviews.length === 0 ? (
          <EmptyState icon="⭐" title="Aucun avis" text="Les commentaires laissés par les passagers apparaîtront ici." />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {reviews.map((r) => (
              <li key={r.id} className={`rounded-2xl bg-subtle p-4 ${r.hidden ? "opacity-60" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-amber-500" aria-label={`${r.rating} sur 5`}>
                    {"★".repeat(r.rating)}
                    <span className="text-line">{"★".repeat(5 - r.rating)}</span>
                  </span>
                  <span className="text-xs text-muted">{formatDateTime(r.date)}</span>
                </div>
                <p className="mt-2 text-sm">« {r.comment} »</p>
                <p className="mt-1 text-xs text-muted">
                  {r.passenger} → {r.driver ?? "—"} · course #{r.id}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs font-semibold ${r.hidden ? "text-muted" : "text-emerald-700"}`}>
                    {r.hidden ? "Masqué du site" : "Visible sur le site"}
                  </span>
                  <span className="inline-flex gap-3">
                    <ActionButton
                      tone={r.hidden ? "success" : "muted"}
                      disabled={action.busy === `r-${r.id}`}
                      onClick={() => action.run(`r-${r.id}`, `/api/admin/reviews/${r.id}`, { hidden: !r.hidden })}
                    >
                      {r.hidden ? "Afficher sur le site" : "Masquer du site"}
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      confirm="Confirmer la suppression"
                      disabled={action.busy === `d-${r.id}`}
                      onClick={() => action.run(`d-${r.id}`, `/api/admin/reviews/${r.id}/delete`)}
                    >
                      Supprimer
                    </ActionButton>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
