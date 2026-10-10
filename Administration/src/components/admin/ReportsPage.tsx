"use client";

import { useState } from "react";
import { MapView } from "@/components/MapView";
import { useAdminData } from "@/hooks/useAdminData";
import { formatFcfa } from "@/lib/pricing";
import type { MonthlyReport } from "@/lib/types";
import { Card, LoadingRows, PageError, PageHeader, StatTile, TableWrap, td, th } from "./ui";

const EXPORTS = [
  { kind: "courses", label: "Courses", monthly: true },
  { kind: "abonnements", label: "Abonnements", monthly: true },
  { kind: "reclamations", label: "Réclamations", monthly: true },
  { kind: "chauffeurs", label: "Chauffeurs", monthly: false },
  { kind: "passagers", label: "Passagers", monthly: false },
];

function Bars({ values, labels, color = "bg-brand" }: { values: number[]; labels: string[]; color?: string }) {
  const max = Math.max(1, ...values);
  return (
    <div className="flex h-40 items-end gap-[2px]">
      {values.map((v, i) => (
        <div key={i} className="group relative flex flex-1 flex-col items-center justify-end">
          <div className={`w-full rounded-t ${color}`} style={{ height: `${Math.max(2, (v / max) * 130)}px` }} title={`${labels[i]} : ${v}`} />
          {(values.length <= 12 || i % Math.ceil(values.length / 12) === 0) && <span className="mt-1 text-[9px] text-muted">{labels[i]}</span>}
        </div>
      ))}
    </div>
  );
}

export function ReportsPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data, error, loading } = useAdminData<{ report: MonthlyReport }>(`/api/admin/reports?month=${month}`, 120_000);
  const report = data?.report;
  const monthLabel = new Date(`${month}-01T12:00:00Z`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <>
      <PageHeader
        title="Rapports et exports"
        subtitle={`Activité de ${monthLabel}.`}
        actions={
          <input
            type="month"
            value={month}
            max={new Date().toISOString().slice(0, 7)}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
            className="h-10 rounded-2xl border border-line bg-surface px-3 text-sm"
          />
        }
      />
      <PageError message={error} />

      <Card title="📥 Exports pour Excel" className="mb-6">
        <div className="flex flex-wrap gap-2">
          {EXPORTS.map((e) => (
            <a
              key={e.kind}
              href={`/api/admin/exports/${e.kind}${e.monthly ? `?month=${month}` : ""}`}
              className="rounded-xl bg-subtle px-4 py-2 text-sm font-semibold hover:bg-line"
            >
              {e.label}
              {e.monthly ? ` (${monthLabel})` : " (liste complète)"}
            </a>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Fichiers CSV à ouvrir avec Excel ou LibreOffice (séparateur point-virgule).</p>
      </Card>

      {loading && !report ? (
        <LoadingRows />
      ) : report ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Courses terminées" value={report.rides.completed} sub={`${report.rides.total} demandes · ${report.rides.scheduled} réservées`} />
            <StatTile label="Taux d'annulation" value={`${report.rides.cancelRate} %`} sub={`${report.rides.cancelled} annulées`} highlight={report.rides.cancelRate > 30} />
            <StatTile label="Montant des courses" value={formatFcfa(report.ridesRevenue)} sub="encaissé par les chauffeurs" />
            <StatTile label="Abonnements encaissés" value={formatFcfa(report.subscriptionsRevenue)} sub="revenu SURPLACE" />
            <StatTile label="Nouveaux passagers" value={report.newPassengers} />
            <StatTile label="Nouveaux chauffeurs" value={report.newDrivers} />
            <StatTile label="Chauffeurs actifs" value={report.activeDrivers} sub="au moins une course" />
            <StatTile
              label="Note moyenne"
              value={report.averageRating != null ? `★ ${report.averageRating}` : "—"}
              sub={report.averageDistanceKm != null ? `Trajet moyen ${report.averageDistanceKm} km` : undefined}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Courses terminées par jour">
              <Bars values={report.days.map((d) => d.completed)} labels={report.days.map((d) => d.day.slice(8))} />
            </Card>
            <Card title="Heures de pointe (demandes)">
              <Bars values={report.hours} labels={report.hours.map((_, h) => `${h}h`)} color="bg-sky-500" />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Meilleurs chauffeurs du mois">
              {report.topDrivers.length === 0 ? (
                <p className="text-sm text-muted">Aucune course terminée ce mois-ci.</p>
              ) : (
                <TableWrap minWidth={420}>
                  <thead>
                    <tr>
                      <th className={th}>Chauffeur</th>
                      <th className={th}>Courses</th>
                      <th className={th}>Montant</th>
                      <th className={th}>Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {report.topDrivers.map((d) => (
                      <tr key={d.name}>
                        <td className={`${td} font-semibold`}>{d.name}</td>
                        <td className={td}>{d.rides}</td>
                        <td className={td}>{formatFcfa(d.earnings)}</td>
                        <td className={td}>{d.rating != null ? `★ ${d.rating}` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </TableWrap>
              )}
            </Card>
            <Card title="Zones les plus demandées">
              <div className="h-72 overflow-hidden rounded-2xl">
                <MapView markers={[]} heat={report.demand} fitTo={report.demand.slice(0, 10).map((c) => ({ lat: c.lat, lng: c.lng }))} />
              </div>
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
