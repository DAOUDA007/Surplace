import { db } from "./db";
import { referralStats } from "./referrals";
import type { DemandCell, DriverStats } from "./types";

const DAY = 86_400_000;
const dayStart = (offsetDays = 0) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - offsetDays * DAY);
};

/** Minutes passées en ligne depuis une date (sessions coupées à cette date). */
function onlineMinutes(driverId: number, since: Date) {
  const rows = db
    .prepare("SELECT started_at, ended_at FROM driver_online_log WHERE driver_id = ? AND (ended_at IS NULL OR ended_at > ?)")
    .all(driverId, since.toISOString()) as { started_at: string; ended_at: string | null }[];
  let ms = 0;
  for (const r of rows) {
    const start = Math.max(new Date(r.started_at).getTime(), since.getTime());
    const end = r.ended_at ? new Date(r.ended_at).getTime() : Date.now();
    ms += Math.max(0, end - start);
  }
  return Math.round(ms / 60_000);
}

export function driverStats(driverId: number): DriverStats {
  const today = dayStart();
  const week = dayStart(6);
  const sums = (since: Date) =>
    db
      .prepare(
        "SELECT COUNT(*) AS rides, COALESCE(SUM(price), 0) AS earnings FROM rides WHERE driver_id = ? AND status = 'completed' AND completed_at >= ?",
      )
      .get(driverId, since.toISOString()) as { rides: number; earnings: number };

  const days: DriverStats["days"] = [];
  for (let i = 6; i >= 0; i--) {
    const day = dayStart(i).toISOString().slice(0, 10);
    const r = db
      .prepare(
        "SELECT COUNT(*) AS rides, COALESCE(SUM(price), 0) AS earnings FROM rides WHERE driver_id = ? AND status = 'completed' AND substr(completed_at, 1, 10) = ?",
      )
      .get(driverId, day) as { rides: number; earnings: number };
    days.push({ day, ...r });
  }

  const offers = Object.fromEntries(
    (db.prepare("SELECT response, COUNT(*) AS n FROM ride_offers WHERE driver_id = ? GROUP BY response").all(driverId) as {
      response: string;
      n: number;
    }[]).map((r) => [r.response, r.n]),
  ) as Record<string, number>;
  const accepted = offers.accepted ?? 0;
  const declined = offers.declined ?? 0;
  const expired = offers.expired ?? 0;
  const answered = accepted + declined + expired;

  const rating = db.prepare("SELECT rating_sum, rating_count FROM drivers WHERE user_id = ?").get(driverId) as {
    rating_sum: number;
    rating_count: number;
  };
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const r of db.prepare("SELECT rating, COUNT(*) AS n FROM rides WHERE driver_id = ? AND rating IS NOT NULL GROUP BY rating").all(driverId) as {
    rating: number;
    n: number;
  }[]) {
    distribution[r.rating] = r.n;
  }

  return {
    today: { ...sums(today), onlineMinutes: onlineMinutes(driverId, today) },
    week: { ...sums(week), onlineMinutes: onlineMinutes(driverId, week) },
    days,
    acceptanceRate: answered ? Math.round((accepted / answered) * 100) : null,
    offers: { accepted, declined, expired },
    rating: rating.rating_count ? Math.round((rating.rating_sum / rating.rating_count) * 10) / 10 : null,
    ratingDistribution: distribution,
    referrals: referralStats(driverId),
  };
}

/**
 * Zones où les passagers demandent le plus de courses (carte de chaleur).
 * Les départs sont regroupés dans des carrés d'environ 550 m. `hour` restreint à une tranche horaire (± 1 h).
 */
export function demandCells(days = 30, hour?: number): DemandCell[] {
  const since = new Date(Date.now() - days * DAY).toISOString();
  const rows = db
    .prepare("SELECT pickup_lat AS lat, pickup_lng AS lng, requested_at FROM rides WHERE requested_at >= ?")
    .all(since) as { lat: number; lng: number; requested_at: string }[];
  const STEP = 0.005;
  const cells = new Map<string, DemandCell>();
  for (const r of rows) {
    if (hour != null) {
      const h = new Date(r.requested_at).getUTCHours();
      const diff = Math.min(Math.abs(h - hour), 24 - Math.abs(h - hour));
      if (diff > 1) continue;
    }
    const lat = Math.round(r.lat / STEP) * STEP;
    const lng = Math.round(r.lng / STEP) * STEP;
    const key = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const cell = cells.get(key) ?? { lat, lng, count: 0 };
    cell.count++;
    cells.set(key, cell);
  }
  return [...cells.values()].sort((a, b) => b.count - a.count).slice(0, 60);
}
