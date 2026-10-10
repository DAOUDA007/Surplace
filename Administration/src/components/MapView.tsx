"use client";

import dynamic from "next/dynamic";

// Leaflet a besoin de `window` : chargement uniquement côté navigateur.
export const MapView = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse bg-line" />,
});

export type { MapMarker, MapProps } from "./LeafletMap";
