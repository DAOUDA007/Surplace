import { HistoryPage } from "@/components/RideHistory";
import { formatMinutes } from "@/lib/format";
import { formatFcfa } from "@/lib/pricing";
import { backendGet, requirePageUser } from "@/lib/server";
import type { DriverStats, DriverSubscription, Ride } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes gains — SURPLACE" };

export default async function DriverHistory() {
  await requirePageUser("driver");
  const [ridesData, subscription, stats] = await Promise.all([
    backendGet<{ rides: Ride[] }>("/rides"),
    backendGet<DriverSubscription>("/driver/subscription"),
    backendGet<DriverStats>("/driver/stats"),
  ]);
  const rides = ridesData?.rides ?? [];
  const completed = rides.filter((r) => r.status === "completed");
  const total = completed.reduce((s, r) => s + r.price, 0);

  const tiles = [
    { label: "Aujourd'hui", value: formatFcfa(stats?.today.earnings ?? 0), sub: `${stats?.today.rides ?? 0} course(s)` },
    { label: "7 derniers jours", value: formatFcfa(stats?.week.earnings ?? 0), sub: `${stats?.week.rides ?? 0} course(s)` },
    { label: "En ligne aujourd'hui", value: formatMinutes(stats?.today.onlineMinutes ?? 0), sub: `${formatMinutes(stats?.week.onlineMinutes ?? 0)} sur 7 jours` },
    {
      label: "Taux d'acceptation",
      value: stats?.acceptanceRate != null ? `${stats.acceptanceRate} %` : "—",
      sub: stats ? `${stats.offers.accepted} acceptée(s) · ${stats.offers.declined} refusée(s) · ${stats.offers.expired} sans réponse` : "",
    },
    { label: "Note moyenne", value: stats?.rating != null ? `★ ${stats.rating.toFixed(1)}` : "Nouveau", sub: "donnée par les passagers" },
    {
      label: "Abonnement",
      value: subscription?.active ? `${subscription.daysLeft} j restant${subscription.daysLeft > 1 ? "s" : ""}` : "Expiré",
      sub: `Total gagné : ${formatFcfa(total)} (sans commission)`,
    },
  ];
  const maxDay = Math.max(1, ...(stats?.days ?? []).map((d) => d.earnings));
  const ratingCount = stats ? Object.values(stats.ratingDistribution).reduce((a, b) => a + b, 0) : 0;

  return (
    <HistoryPage
      title="Mes gains"
      backHref="/chauffeur"
      rides={rides}
      showDriver={false}
      summary={
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {tiles.map((t) => (
              <div key={t.label} className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-line">
                <p className="text-xs text-muted">{t.label}</p>
                <p className="mt-1 text-xl font-extrabold">{t.value}</p>
                {t.sub && <p className="mt-0.5 text-[11px] text-muted">{t.sub}</p>}
              </div>
            ))}
          </div>

          {stats && (
            <div className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-line">
              <p className="mb-3 text-sm font-bold">Gains des 7 derniers jours</p>
              <div className="flex h-36 items-end gap-2">
                {stats.days.map((d) => (
                  <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-[10px] text-muted">{d.earnings ? `${Math.round(d.earnings / 100) / 10}k` : ""}</span>
                    <div className="w-full rounded-t-lg bg-brand" style={{ height: `${Math.max(3, (d.earnings / maxDay) * 100)}px` }} />
                    <span className="text-[10px] text-muted">
                      {new Date(d.day).toLocaleDateString("fr-FR", { weekday: "short" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats && ratingCount > 0 && (
            <div className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-line">
              <p className="mb-2 text-sm font-bold">Vos notes ({ratingCount})</p>
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex items-center gap-2 text-xs">
                  <span className="w-6">{n} ★</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-subtle">
                    <div className="h-full bg-amber-400" style={{ width: `${(stats.ratingDistribution[n] / ratingCount) * 100}%` }} />
                  </div>
                  <span className="w-6 text-right text-muted">{stats.ratingDistribution[n]}</span>
                </div>
              ))}
            </div>
          )}

          {stats?.referrals.code && (
            <p className="rounded-2xl bg-brand-soft px-4 py-3 text-sm">
              🎁 Parrainage : <strong>{stats.referrals.count}</strong> chauffeur(s) inscrit(s) avec votre code{" "}
              <strong>{stats.referrals.code}</strong>, dont {stats.referrals.rewarded} récompensé(s).
            </p>
          )}
        </div>
      }
    />
  );
}
