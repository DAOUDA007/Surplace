"use client";

import Link from "next/link";
import { MapView, type MapMarker } from "@/components/MapView";
import { Route, StatusBadge } from "@/components/ui";
import { useAdminData } from "@/hooks/useAdminData";
import { formatDateTime } from "@/lib/format";
import { formatFcfa } from "@/lib/pricing";
import type { AdminOverview } from "@/lib/types";
import { Card, EmptyState, LoadingRows, PageError, PageHeader, StatTile } from "./ui";

function WeekChart({ days }: { days: AdminOverview["days"] }) {
  const max = Math.max(1, ...days.map((d) => d.completed));
  return (
    <figure>
      <div className="flex h-40 items-end gap-[2px] border-b border-line" aria-hidden>
        {days.map((d) => {
          const label = new Date(d.day).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
          return (
            <div key={d.day} className="group relative flex h-full flex-1 items-end justify-center">
              {/* Zone de survol plus large que la barre */}
              <div
                className="w-full max-w-10 rounded-t-[4px] bg-brand transition group-hover:bg-brand-dark"
                style={{ height: `${(d.completed / max) * 100}%`, minHeight: d.completed ? 4 : 0 }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded-xl bg-contrast px-3 py-2 text-xs text-on-contrast shadow-lg group-hover:block">
                <p className="font-semibold capitalize">{label}</p>
                <p>{d.completed} terminée{d.completed > 1 ? "s" : ""}</p>
                <p className="opacity-70">{d.cancelled} annulée{d.cancelled > 1 ? "s" : ""}</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-[2px] text-center text-xs text-muted" aria-hidden>
        {days.map((d) => (
          <span key={d.day} className="flex-1 capitalize">
            {new Date(d.day).toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
          </span>
        ))}
      </div>
      {/* Version tableau pour les lecteurs d'écran */}
      <table className="sr-only">
        <caption>Courses terminées et annulées par jour, sur 7 jours</caption>
        <thead>
          <tr>
            <th>Jour</th>
            <th>Terminées</th>
            <th>Annulées</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.completed}</td>
              <td>{d.cancelled}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export function OverviewPage() {
  const { data, error, loading } = useAdminData<AdminOverview>("/api/admin/overview", 10_000);

  if (loading && !data) return <LoadingRows />;
  if (!data) return <PageError message={error} />;
  const { stats, days, onlineDrivers, activeRides } = data;

  const todo = [
    { count: stats.driversPending, label: "chauffeur(s) à valider", href: "/admin/chauffeurs?statut=pending", icon: "🪪" },
    { count: stats.subscriptionsPending, label: "paiement(s) d'abonnement à confirmer", href: "/admin/abonnements", icon: "💳" },
    { count: stats.messagesUnread, label: "message(s) non traité(s)", href: "/admin/messages", icon: "✉️" },
  ].filter((t) => t.count > 0);

  const markers: MapMarker[] = [
    ...onlineDrivers.map((d) => ({
      id: `d-${d.id}`,
      kind: "driver" as const,
      position: { lat: d.lat, lng: d.lng },
      label: `${d.name} · ${d.plate}`,
    })),
    ...activeRides
      .filter((r) => r.status === "requested")
      .map((r) => ({ id: `r-${r.id}`, kind: "request" as const, position: r.pickup, label: `Demande #${r.id}` })),
  ];

  return (
    <>
      <PageHeader
        title="Vue d'ensemble"
        subtitle={`Aujourd'hui, ${new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}`}
      />
      <PageError message={error} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile
          label="Courses aujourd'hui"
          value={stats.ridesToday}
          sub={`${stats.completedToday} terminées · ${stats.cancelledToday} annulées`}
        />
        <StatTile label="Courses en cours" value={stats.activeRides} />
        <StatTile label="Chauffeurs en ligne" value={`${stats.driversOnline} / ${stats.drivers}`} />
        <StatTile
          label="Passagers inscrits"
          value={stats.passengers}
          sub={stats.passengersToday ? `+${stats.passengersToday} aujourd'hui` : undefined}
        />
        <StatTile
          label="Abonnements ce mois"
          value={formatFcfa(stats.subscriptionRevenueMonth)}
          sub={`${formatFcfa(stats.subscriptionRevenueTotal)} au total`}
        />
        <StatTile label="Chauffeurs abonnés" value={`${stats.activeSubscribers} / ${stats.drivers}`} />
        <StatTile
          label="Montant des courses du jour"
          value={formatFcfa(stats.revenueToday)}
          sub="encaissé par les chauffeurs"
        />
        <StatTile label="Montant total des courses" value={formatFcfa(stats.revenueTotal)} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="relative min-h-[360px] overflow-hidden rounded-3xl shadow-sm ring-1 ring-line">
          <div className="absolute inset-0">
            <MapView markers={markers} fitTo={markers.map((m) => m.position)} />
          </div>
          <p className="absolute left-3 top-3 z-[500] rounded-full bg-surface px-3 py-1 text-xs font-semibold shadow">
            🟢 Carte en direct · {onlineDrivers.length} chauffeur{onlineDrivers.length > 1 ? "s" : ""} en ligne
          </p>
        </section>
        <div className="space-y-6">
          <Card title="À traiter">
            {todo.length === 0 ? (
              <p className="text-sm text-muted">✅ Rien en attente. Tout est à jour.</p>
            ) : (
              <ul className="space-y-2">
                {todo.map((t) => (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      className="flex items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:ring-1 hover:ring-amber-200"
                    >
                      <span>{t.icon}</span>
                      <span className="flex-1">
                        <strong>{t.count}</strong> {t.label}
                      </span>
                      <span>→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Courses terminées · 7 jours">
            <WeekChart days={days} />
          </Card>
        </div>
      </div>

      <Card
        title="Courses en cours"
        className="mt-6"
        action={
          <Link href="/admin/courses?statut=active" className="text-sm font-semibold text-brand">
            Tout voir →
          </Link>
        }
      >
        {activeRides.length === 0 ? (
          <EmptyState icon="🛵" title="Aucune course en cours" />
        ) : (
          <ul className="divide-y divide-line">
            {activeRides.map((r) => (
              <li key={r.id} className="grid gap-2 py-3 sm:grid-cols-[1fr_200px_auto] sm:items-center">
                <Route from={r.pickup.label} to={r.dropoff.label} />
                <p className="text-sm text-muted">
                  {r.passenger.name} → {r.driver?.name ?? "en attente"}
                  <span className="block text-xs">{formatDateTime(r.requestedAt)}</span>
                </p>
                <StatusBadge status={r.status} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
