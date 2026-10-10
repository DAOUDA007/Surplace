"use client";

import { useEffect, useState } from "react";
import { DriverPhoto } from "@/components/DriverPhoto";
import { Logo } from "@/components/Logo";
import { MapView, type MapMarker } from "@/components/MapView";
import { Route, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import type { LatLng, TrackedRide } from "@/lib/types";

/** Suivi en direct d'une course partagée : position de la moto, chauffeur, étape. Actualisé toutes les 5 s. */
export function TrackView({ token }: { token: string }) {
  const [ride, setRide] = useState<TrackedRide | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    const load = () =>
      api<{ ride: TrackedRide }>(`/api/public/track/${token}`)
        .then((d) => {
          if (alive) {
            setRide(d.ride);
            setError("");
          }
        })
        .catch((err) => alive && setError((err as Error).message));
    load();
    const t = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [token]);

  const driver = ride?.driver;
  const driverPos: LatLng | null = driver?.lat != null && driver.lng != null ? { lat: driver.lat, lng: driver.lng } : null;
  const markers: MapMarker[] = [];
  if (ride) {
    markers.push({ id: "pickup", kind: "pickup", position: ride.pickup, label: "Départ" });
    markers.push({ id: "dropoff", kind: "dropoff", position: ride.dropoff, label: "Arrivée" });
  }
  if (driverPos) markers.push({ id: "driver", kind: "driver", position: driverPos, label: driver?.name });
  const fitTo = [driverPos, ride?.pickup, ride?.dropoff].filter((p): p is LatLng => !!p);

  return (
    <main className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-2 bg-surface px-4 py-3 shadow-sm">
        <Logo />
        <span className="text-sm font-semibold text-muted">Suivi en direct</span>
      </header>
      <div className="relative flex-1">
        <MapView markers={markers} fitTo={fitTo} route={ride ? [ride.pickup, ride.dropoff] : null} />
      </div>
      <section className="space-y-3 bg-surface p-4 shadow-[0_-8px_30px_rgb(0_0_0/0.12)]">
        {error ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>
        ) : !ride ? (
          <div className="h-24 animate-pulse rounded-2xl bg-subtle" />
        ) : (
          <>
            <div className="flex items-center justify-between">
              <StatusBadge status={ride.status} />
              <span className="text-xs text-muted">Actualisé toutes les 5 secondes</span>
            </div>
            {driver && (
              <div className="flex items-center gap-3 rounded-2xl bg-subtle p-3">
                <DriverPhoto src={driver.photoUrl} name={driver.name} />
                <div>
                  <p className="font-bold">{driver.name}</p>
                  <p className="text-sm text-muted">
                    {driver.motoModel} · <span className="font-semibold text-ink">{driver.plate}</span>
                  </p>
                </div>
              </div>
            )}
            <Route from={ride.pickup.label} to={ride.dropoff.label} />
          </>
        )}
      </section>
    </main>
  );
}
