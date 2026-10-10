"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { CITY_CENTER } from "@/lib/places";
import type { LatLng } from "@/lib/types";

export type MarkerKind = "pickup" | "dropoff" | "driver" | "request";

export interface MapMarker {
  id: string;
  position: LatLng;
  kind: MarkerKind;
  label?: string;
  onClick?: () => void;
  /** Rend le marqueur déplaçable ; reçoit la nouvelle position une fois lâché. */
  onDragEnd?: (point: LatLng) => void;
}

export interface MapProps {
  markers: MapMarker[];
  route?: [LatLng, LatLng] | null;
  /** Points à garder visibles ; la carte se recadre quand leur liste change. */
  fitTo?: LatLng[];
  onMapClick?: (point: LatLng) => void;
  className?: string;
  /** Hauteur (px) masquée par le panneau du bas, pour recadrer au-dessus. */
  bottomPadding?: number;
  /** Cercle de précision de la localisation (rayon en mètres). */
  accuracy?: { center: LatLng; radius: number } | null;
}

function pin(color: string, letter: string) {
  return L.divIcon({
    className: "",
    html: `<div class="pin-marker" style="--pin:${color}"><span>${letter}</span></div>`,
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    tooltipAnchor: [0, -36],
  });
}

const ICONS: Record<MarkerKind, L.DivIcon> = {
  pickup: pin("#16a34a", "D"),
  dropoff: pin("#dc2626", "A"),
  request: pin("#f59e0b", "!"),
  driver: L.divIcon({
    className: "",
    html: `<div class="driver-marker">🏍️</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  }),
};

function ClickHandler({ onClick }: { onClick?: (p: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onClick?.({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function FitBounds({ points, bottomPadding }: { points: LatLng[]; bottomPadding: number }) {
  const map = useMap();
  const key = points.map((p) => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|");
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], Math.max(map.getZoom(), 15), { animate: true });
      return;
    }
    map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng])), {
      paddingTopLeft: [40, 90],
      paddingBottomRight: [40, bottomPadding + 40],
      maxZoom: 16,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);
  return null;
}

export default function LeafletMap({
  markers,
  route,
  fitTo = [],
  onMapClick,
  className,
  bottomPadding = 0,
  accuracy,
}: MapProps) {
  // Centre initial uniquement ; ensuite FitBounds pilote la vue.
  const center = useMemo(() => fitTo[0] ?? CITY_CENTER, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      zoomControl={false}
      className={className ?? "h-full w-full"}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ClickHandler onClick={onMapClick} />
      <FitBounds points={fitTo} bottomPadding={bottomPadding} />
      {route && (
        <Polyline
          positions={route.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={{ color: "#111827", weight: 4, dashArray: "8 8", opacity: 0.7 }}
        />
      )}
      {accuracy && (
        <Circle
          center={[accuracy.center.lat, accuracy.center.lng]}
          radius={accuracy.radius}
          pathOptions={{ color: "#16a34a", weight: 1, fillOpacity: 0.12 }}
        />
      )}
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.position.lat, m.position.lng]}
          icon={ICONS[m.kind]}
          draggable={!!m.onDragEnd}
          eventHandlers={{
            ...(m.onClick ? { click: m.onClick } : {}),
            ...(m.onDragEnd
              ? {
                  dragend: (e: L.LeafletEvent) => {
                    const p = (e.target as L.Marker).getLatLng();
                    m.onDragEnd!({ lat: p.lat, lng: p.lng });
                  },
                }
              : {}),
          }}
        >
          {m.label && <Tooltip direction="top">{m.label}</Tooltip>}
        </Marker>
      ))}
    </MapContainer>
  );
}
