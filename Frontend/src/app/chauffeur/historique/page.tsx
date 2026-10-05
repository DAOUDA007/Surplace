import { HistoryPage } from "@/components/RideHistory";
import { backendGet, requirePageUser } from "@/lib/server";
import { formatFcfa } from "@/lib/pricing";
import type { DriverSubscription, Ride } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mes gains — SURPLACE" };

export default async function DriverHistory() {
  await requirePageUser("driver");
  const [ridesData, subscription] = await Promise.all([
    backendGet<{ rides: Ride[] }>("/rides"),
    backendGet<DriverSubscription>("/driver/subscription"),
  ]);
  const rides = ridesData?.rides ?? [];
  const completed = rides.filter((r) => r.status === "completed");

  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const today = new Date().toISOString().slice(0, 10);
  const sum = (list: typeof completed) => list.reduce((s, r) => s + r.price, 0);
  const todayTotal = sum(completed.filter((r) => r.completedAt?.startsWith(today)));
  const weekTotal = sum(completed.filter((r) => r.completedAt && new Date(r.completedAt).getTime() > weekAgo));
  const total = sum(completed);

  const tiles = [
    { label: "Aujourd'hui", value: formatFcfa(todayTotal) },
    { label: "7 derniers jours", value: formatFcfa(weekTotal) },
    { label: "Courses terminées", value: String(completed.length) },
    { label: "Total gagné (sans commission)", value: formatFcfa(total) },
    {
      label: "Abonnement",
      value: subscription?.active
        ? `${subscription.daysLeft} j restant${subscription.daysLeft > 1 ? "s" : ""}`
        : "Expiré",
    },
  ];

  return (
    <HistoryPage
      title="Mes gains"
      backHref="/chauffeur"
      rides={rides}
      showDriver={false}
      summary={
        <div className="mt-6 grid grid-cols-2 gap-3">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-3xl bg-surface p-4 shadow-sm ring-1 ring-line">
              <p className="text-xs text-muted">{t.label}</p>
              <p className="mt-1 text-xl font-extrabold">{t.value}</p>
            </div>
          ))}
        </div>
      }
    />
  );
}
