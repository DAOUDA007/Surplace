"use client";

import Link from "next/link";
import { useState } from "react";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { formatDateTime, formatPhone } from "@/lib/format";
import type { AdminComplaint } from "@/lib/types";
import { ActionButton, Card, EmptyState, FilterTabs, LoadingRows, PageError, PageHeader } from "./ui";

type Filter = "open" | "resolved" | "all";

function ComplaintCard({ c, onResolve, onDelete, busy }: { c: AdminComplaint; onResolve: (note: string) => void; onDelete: () => void; busy: boolean }) {
  const [note, setNote] = useState("");
  return (
    <Card>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-subtle px-2.5 py-0.5 text-xs font-bold">{c.category}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${c.status === "open" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}>
              {c.status === "open" ? "À traiter" : "Traitée"}
            </span>
            {c.rideId && (
              <Link href="/courses" className="text-xs font-semibold text-brand" title="Recherchez ce numéro dans l'écran Courses">
                Course n°{c.rideId}
              </Link>
            )}
          </div>
          <span className="text-xs text-muted">{formatDateTime(c.createdAt)}</span>
        </div>
        <p className="text-sm">
          <strong>{c.author}</strong> ({c.authorRole === "driver" ? "chauffeur" : "passager"}) ·{" "}
          <a href={`tel:${c.authorPhone}`} className="text-brand">
            {formatPhone(c.authorPhone)}
          </a>
        </p>
        <p className="whitespace-pre-wrap rounded-2xl bg-subtle p-3 text-sm">{c.message}</p>
        {c.status === "open" ? (
          <div className="space-y-2">
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Réponse envoyée à la personne (dans ses notifications)…"
              className="w-full rounded-xl border border-line bg-surface p-3 text-sm"
            />
            <div className="flex items-center justify-between">
              <ActionButton onClick={onDelete} tone="danger" confirm="Confirmer la suppression">
                Supprimer
              </ActionButton>
              <button
                type="button"
                disabled={busy}
                onClick={() => onResolve(note)}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Marquer traitée et répondre
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Réponse : {c.adminNote ?? "—"} {c.resolvedAt && `(le ${formatDateTime(c.resolvedAt)})`}
          </p>
        )}
      </div>
    </Card>
  );
}

export function ComplaintsPage() {
  const [filter, setFilter] = useState<Filter>("open");
  const { data, error, loading } = useAdminData<{ complaints: AdminComplaint[] }>(`/api/admin/complaints?status=${filter}`);
  const action = useAdminAction();
  const list = data?.complaints ?? [];

  return (
    <>
      <PageHeader
        title="Réclamations"
        subtitle="Problèmes signalés par les passagers et les chauffeurs (objet perdu, prix, comportement…)."
        actions={
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "open", label: "À traiter" },
              { value: "resolved", label: "Traitées" },
              { value: "all", label: "Toutes" },
            ]}
          />
        }
      />
      <PageError message={error || action.error} />
      {loading && !data ? (
        <LoadingRows />
      ) : list.length === 0 ? (
        <Card>
          <EmptyState icon="📮" title="Aucune réclamation" />
        </Card>
      ) : (
        <div className="space-y-4">
          {list.map((c) => (
            <ComplaintCard
              key={c.id}
              c={c}
              busy={action.busy === `c-${c.id}`}
              onResolve={(note) => action.run(`c-${c.id}`, `/api/admin/complaints/${c.id}/resolve`, { note })}
              onDelete={() => action.run(`d-${c.id}`, `/api/admin/complaints/${c.id}/delete`)}
            />
          ))}
        </div>
      )}
    </>
  );
}
