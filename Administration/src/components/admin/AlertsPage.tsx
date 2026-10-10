"use client";

import { useState } from "react";
import { MapView } from "@/components/MapView";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { formatDateTime, formatPhone, timeAgo } from "@/lib/format";
import type { EmergencyAlert } from "@/lib/types";
import { Card, EmptyState, FilterTabs, LoadingRows, PageError, PageHeader } from "./ui";

const ROLE: Record<string, string> = { passenger: "Passager", driver: "Chauffeur", admin: "Admin" };

function AlertCard({ alert, onHandle, busy }: { alert: EmergencyAlert; onHandle: (note: string) => void; busy: boolean }) {
  const [note, setNote] = useState("");
  const open = !alert.handledAt;
  const ride = alert.ride;
  const position = alert.lat != null && alert.lng != null ? { lat: alert.lat, lng: alert.lng } : null;

  return (
    <Card className={open ? "ring-2 ring-red-500" : ""}>
      <div className="grid gap-4 md:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${open ? "bg-red-600 text-white" : "bg-emerald-100 text-emerald-800"}`}>
              {open ? "🆘 À TRAITER" : "Traitée"}
            </span>
            <span className="text-sm text-muted">
              {formatDateTime(alert.createdAt)} · {timeAgo(alert.createdAt)}
            </span>
          </div>
          <div>
            <p className="text-lg font-extrabold">
              {alert.userName} <span className="text-sm font-normal text-muted">({ROLE[alert.userRole]})</span>
            </p>
            <a href={`tel:${alert.userPhone}`} className="font-semibold text-brand">
              📞 {formatPhone(alert.userPhone)}
            </a>
            {alert.emergencyContact && <p className="text-sm text-muted">Personne à prévenir : {alert.emergencyContact} (SMS envoyé)</p>}
          </div>
          {ride && (
            <div className="rounded-2xl bg-subtle p-3 text-sm">
              <p className="font-semibold">Course n°{ride.id}</p>
              <p>
                {ride.pickup.label} → {ride.dropoff.label}
              </p>
              <p className="text-muted">
                Passager : {ride.passenger.name} · {formatPhone(ride.passenger.phone)}
                {ride.driver && (
                  <>
                    <br />
                    Chauffeur : {ride.driver.name} · {ride.driver.plate} ·{" "}
                    <a href={`tel:${ride.driver.phone}`} className="font-semibold text-brand">
                      {formatPhone(ride.driver.phone)}
                    </a>
                  </>
                )}
              </p>
            </div>
          )}
          {position && (
            <a
              href={`https://www.google.com/maps/?q=${position.lat},${position.lng}`}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm font-semibold text-brand"
            >
              Ouvrir la position dans Google Maps
            </a>
          )}
          {open ? (
            <div className="flex flex-wrap gap-2">
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Note (ex. personne rappelée, tout va bien)"
                className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 text-sm"
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => onHandle(note)}
                className="rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
              >
                Marquer traitée
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Traitée par {alert.handledBy} le {formatDateTime(alert.handledAt!)}
              {alert.note ? ` — « ${alert.note} »` : ""}
            </p>
          )}
        </div>
        {position && (
          <div className="h-56 overflow-hidden rounded-2xl">
            <MapView markers={[{ id: "alert", kind: "request", position, label: "Position de l'alerte" }]} fitTo={[position]} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function AlertsPage() {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const { data, error, loading } = useAdminData<{ alerts: EmergencyAlert[] }>(`/api/admin/alerts?status=${filter}`, 10_000);
  const action = useAdminAction();
  const alerts = data?.alerts ?? [];

  return (
    <>
      <PageHeader
        title="Urgences"
        subtitle="Alertes 🆘 déclenchées pendant une course. Rappelez la personne au plus vite."
        actions={
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "open", label: "À traiter" },
              { value: "all", label: "Toutes" },
            ]}
          />
        }
      />
      <PageError message={error || action.error} />
      {loading && !data ? (
        <LoadingRows />
      ) : alerts.length === 0 ? (
        <Card>
          <EmptyState icon="✅" title="Aucune alerte" text={filter === "open" ? "Aucune urgence en attente." : "Aucune alerte enregistrée."} />
        </Card>
      ) : (
        <div className="space-y-4">
          {alerts.map((a) => (
            <AlertCard
              key={a.id}
              alert={a}
              busy={action.busy === `a-${a.id}`}
              onHandle={(note) => action.run(`a-${a.id}`, `/api/admin/alerts/${a.id}/handle`, { note })}
            />
          ))}
        </div>
      )}
    </>
  );
}
