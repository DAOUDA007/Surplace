"use client";

import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { formatDateTime } from "@/lib/format";
import type { SystemStatus } from "@/lib/types";
import { Card, LoadingRows, PageError, PageHeader, StatTile } from "./ui";

const size = (bytes: number) =>
  bytes > 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} Mo` : `${Math.max(1, Math.round(bytes / 1024))} Ko`;

function uptime(seconds: number) {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return d ? `${d} j ${h} h` : h ? `${h} h ${m} min` : `${m} min`;
}

function Line({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-2">
      <span>{ok ? "🟢" : "🟠"}</span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-xs text-muted">{detail}</span>
      </span>
    </li>
  );
}

/** État du serveur, services configurés et sauvegardes de la base. */
export function SystemPage() {
  const { data, error, loading } = useAdminData<{ status: SystemStatus & { push: { enabled: boolean; subscriptions?: number } } }>(
    "/api/admin/system",
    30_000,
  );
  const action = useAdminAction();
  const s = data?.status;

  return (
    <>
      <PageHeader
        title="Système et sauvegardes"
        subtitle="Une sauvegarde de la base est faite chaque jour automatiquement et gardée 30 jours."
        actions={
          <button
            type="button"
            onClick={() => action.run("backup", "/api/admin/system/backup")}
            disabled={action.busy === "backup"}
            className="rounded-2xl bg-brand px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {action.busy === "backup" ? "Sauvegarde…" : "💾 Sauvegarder maintenant"}
          </button>
        }
      />
      <PageError message={error || action.error} />
      {loading && !s ? (
        <LoadingRows />
      ) : s ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Serveur démarré depuis" value={uptime(s.uptimeSeconds)} />
            <StatTile label="Base de données" value={size(s.database.sizeBytes)} sub={s.database.ok ? "OK" : "Erreur"} highlight={!s.database.ok} />
            <StatTile label="Écrans connectés" value={s.connectedClients} sub="en temps réel" />
            <StatTile label="Dernière sauvegarde" value={s.backups[0] ? formatDateTime(s.backups[0].createdAt) : "Aucune"} highlight={!s.backups[0]} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Services">
              <ul className="divide-y divide-line">
                <Line ok={s.sms.provider.startsWith("Orange")} label="SMS" detail={`${s.sms.provider} · codes de vérification ${s.sms.otpRequired ? "activés" : "désactivés"}`} />
                <Line ok={s.email.enabled} label="E-mails" detail={s.email.enabled ? "Envoi par Gmail activé" : "Non configuré : e-mails enregistrés en fichiers (Backend/data/emails)"} />
                <Line ok={s.push.enabled} label="Notifications push" detail={`${s.push.subscriptions ?? 0} appareil(s) abonné(s)`} />
                <Line ok={s.routing.osrm} label="Itinéraires routiers" detail={s.routing.osrm ? "OSRM configuré : distances par la route" : "Distances à vol d'oiseau × facteur route (OSRM_URL non défini)"} />
              </ul>
              <p className="mt-3 text-xs text-muted">Ces services se configurent dans Backend/.env (voir la documentation Gbê).</p>
            </Card>
            <Card title={`Sauvegardes (${s.backups.length})`}>
              <p className="mb-3 break-all text-xs text-muted">Dossier : à côté de la base, dans « backups » — {s.database.path}</p>
              {s.backups.length === 0 ? (
                <p className="text-sm text-muted">Aucune sauvegarde pour le moment.</p>
              ) : (
                <ul className="max-h-80 divide-y divide-line overflow-auto text-sm">
                  {s.backups.map((b) => (
                    <li key={b.file} className="flex items-center justify-between gap-3 py-2">
                      <span className="truncate font-mono text-xs">{b.file}</span>
                      <span className="shrink-0 text-xs text-muted">
                        {formatDateTime(b.createdAt)} · {size(b.sizeBytes)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </>
  );
}
