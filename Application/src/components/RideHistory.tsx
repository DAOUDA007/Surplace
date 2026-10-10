import Link from "next/link";
import { ComplaintButton } from "@/components/ComplaintButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Route, StatusBadge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { formatFcfa } from "@/lib/pricing";
import type { Ride } from "@/lib/types";

export function HistoryPage({
  title,
  backHref,
  summary,
  rides,
  showDriver,
}: {
  title: string;
  backHref: string;
  summary?: React.ReactNode;
  rides: Ride[];
  showDriver: boolean;
}) {
  return (
    <main className="mx-auto min-h-full max-w-2xl px-5 py-6">
      <div className="flex items-center justify-between">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm font-semibold text-muted">
          ← Retour à la carte
        </Link>
        <ThemeToggle className="grid h-10 w-10 place-items-center rounded-full bg-surface text-lg shadow-sm ring-1 ring-line" />
      </div>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight">{title}</h1>
      {summary}
      {rides.length === 0 ? (
        <p className="mt-10 text-center text-muted">Aucune course pour le moment.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {rides.map((r) => (
            <li key={r.id} className="space-y-3 rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-line">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted">{formatDateTime(r.requestedAt)}</span>
                <StatusBadge status={r.status} />
              </div>
              <Route from={r.pickup.label} to={r.dropoff.label} />
              <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="text-muted">
                  {showDriver
                    ? r.driver
                      ? `🏍️ ${r.driver.name} · ${r.driver.plate}`
                      : "—"
                    : `🙋 ${r.passenger.name}`}
                  {r.rating != null && <span className="ml-2 text-amber-500">{"★".repeat(r.rating)}</span>}
                </span>
                <span className={`font-extrabold ${r.status === "cancelled" ? "text-faint line-through" : ""}`}>
                  {formatFcfa(r.price)}
                </span>
              </div>
              {r.riderName && <p className="text-xs text-muted">👤 Pour {r.riderName}</p>}
              <ComplaintButton rideId={r.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
