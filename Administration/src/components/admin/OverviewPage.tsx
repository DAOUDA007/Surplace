"use client";

import Link from "next/link";
import { MapView, type MapMarker } from "@/components/MapView";
import { Route, StatusBadge } from "@/components/ui";
import { useAdminData } from "@/hooks/useAdminData";
import { formatDateTime } from "@/lib/format";
import { CountUp } from "@/components/CountUp";
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
                className="bar-grow w-full max-w-10 rounded-t-[4px] bg-brand group-hover:bg-brand-dark"
                style={
                  {
                    height: `${(d.completed / max) * 100}%`,
                    minHeight: d.completed ? 4 : 0,
                    "--d": days.indexOf(d),
                  } as React.CSSProperties
                }
              />
              <div className="animate-pop pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max -translate-x-1/2 rounded-xl bg-contrast px-3 py-2 text-xs text-on-contrast shadow-lg group-hover:block">
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

const fcfa = (n: number) => formatFcfa(Math.round(n));

export function OverviewPage() {
  const { data, error, loading } = useAdminData<AdminOverview>("/api/admin/overview", 10_000);

  if (loading && !data) return <LoadingRows />;
  if (!data) return <PageError message={error} />;
  const { stats, days, onlineDrivers, activeRides } = data;

  const todo = [
    { count: stats.alertsOpen, label: "ALERTE(S) D'URGENCE à traiter tout de suite", href: "/alertes", urgent: true },
    { count: stats.driversPending, label: "chauffeur(s) à valider", href: "/chauffeurs?statut=pending" },
    { count: stats.complaintsOpen, label: "réclamation(s) à traiter", href: "/reclamations" },
    { count: stats.documentsExpiring, label: "document(s) de chauffeur expiré(s) ou bientôt expiré(s)", href: "/chauffeurs" },
    { count: stats.subscriptionsPending, label: "paiement(s) d'abonnement à confirmer", href: "/abonnements" },
    { count: stats.messagesUnread, label: "message(s) non traité(s)", href: "/messages" },
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

      <div className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
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
          value={<CountUp value={stats.subscriptionRevenueMonth} format={fcfa} />}
          sub={`${formatFcfa(stats.subscriptionRevenueTotal)} au total`}
        />
        <StatTile label="Chauffeurs abonnés" value={`${stats.activeSubscribers} / ${stats.drivers}`} />
        <StatTile
          label="Montant des courses du jour"
          value={<CountUp value={stats.revenueToday} format={fcfa} />}
          sub="encaissé par les chauffeurs"
        />
        <StatTile label="Montant total des courses" value={<CountUp value={stats.revenueTotal} format={fcfa} />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <section className="relative min-h-[360px] overflow-hidden rounded-3xl shadow-sm ring-1 ring-line">
          <div className="absolute inset-0">
            <MapView markers={markers} fitTo={markers.map((m) => m.position)} />
          </div>
          <p className="absolute left-3 top-3 z-[500] rounded-full bg-surface px-3 py-1 text-xs font-semibold shadow">
            <span className="live-dot mr-2 text-emerald-500" />
            Carte en direct · {onlineDrivers.length} chauffeur{onlineDrivers.length > 1 ? "s" : ""} en ligne
          </p>
        </section>
        <div className="space-y-6">
          <Card title="À traiter">
            {todo.length === 0 ? (
              <p className="text-sm text-muted">Rien en attente. Tout est à jour.</p>
            ) : (
              <ul className="stagger space-y-2">
                {todo.map((t) => (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition hover:ring-1 ${
                        t.urgent ? "bg-red-50 text-red-700 hover:ring-red-200" : "bg-amber-50 text-amber-800 hover:ring-amber-200"
                      }`}
                    >
                      {t.urgent && <span className="live-dot text-red-600" />}
                      <span className="flex-1">
                        <strong>{t.count}</strong> {t.label}
                      </span>
                      <span className="transition group-hover:translate-x-1">→</span>
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
          <Link href="/courses?statut=active" className="text-sm font-semibold text-brand">
            Tout voir →
          </Link>
        }
      >
        {activeRides.length === 0 ? (
          <EmptyState title="Aucune course en cours" />
        ) : (
          <ul className="stagger divide-y divide-line">
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
