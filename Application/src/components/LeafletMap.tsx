"use client";
// ⚠️ Fichier copié depuis Commun/components/LeafletMap.tsx par scripts/sync-commun.mjs : modifiez l'original dans Commun/.

import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import { maplibreGL } from "@maplibre/maplibre-gl-leaflet";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { Circle, MapContainer, Marker, Polyline, Tooltip, useMap, useMapEvents } from "react-leaflet";
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
  /** Tracé : deux points (ligne pointillée) ou un itinéraire routier complet (ligne pleine). */
  route?: LatLng[] | null;
  /** Cercles colorés selon une intensité (carte des zones demandées). */
  heat?: { lat: number; lng: number; count: number }[];
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
    className: "driver-icon",
    html: `<div class="driver-marker"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  }),
};

/**
 * Fond de carte vectoriel OpenFreeMap (gratuit, sans clé, usage commercial autorisé) : rues nettes à tous
 * les niveaux de zoom, noms lisibles, style proche de Google Maps. Données OpenStreetMap.
 * Si le téléphone ne sait pas l'afficher (pas de WebGL) ou si le serveur ne répond pas, on revient
 * aux images classiques d'OpenStreetMap.
 */
const VECTOR_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const VECTOR_ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank" rel="noreferrer">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noreferrer">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap</a>';
const RASTER_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const RASTER_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function webglSupported() {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function BaseLayer() {
  const map = useMap();
  useEffect(() => {
    let layer: L.Layer | null = null;
    let attribution = "";
    const show = (next: L.Layer, text: string) => {
      if (layer) map.removeLayer(layer);
      if (attribution) map.attributionControl.removeAttribution(attribution);
      layer = next.addTo(map);
      attribution = text;
      map.attributionControl.addAttribution(text);
    };
    const raster = () => show(L.tileLayer(RASTER_URL, { maxZoom: 19 }), RASTER_ATTRIBUTION);

    if (!webglSupported()) {
      raster();
    } else {
      const vector = maplibreGL({ style: VECTOR_STYLE, attributionControl: false });
      show(vector, VECTOR_ATTRIBUTION);
      // Style injoignable (réseau, panne du serveur) : fond classique.
      const gl = vector.getMaplibreMap();
      let loaded = false;
      gl.once("load", () => (loaded = true));
      gl.on("error", () => {
        if (!loaded && layer === vector) raster();
      });
    }
    return () => {
      if (layer) map.removeLayer(layer);
      if (attribution) map.attributionControl.removeAttribution(attribution);
    };
  }, [map]);
  return null;
}

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
  heat,
}: MapProps) {
  const maxHeat = Math.max(1, ...(heat ?? []).map((h) => h.count));
  // Centre initial uniquement ; ensuite FitBounds pilote la vue.
  const center = useMemo(() => fitTo[0] ?? CITY_CENTER, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      maxZoom={19}
      zoomControl={false}
      className={className ?? "h-full w-full"}
    >
      <BaseLayer />
      <ClickHandler onClick={onMapClick} />
      <FitBounds points={fitTo} bottomPadding={bottomPadding} />
      {route && (
        <Polyline
          positions={route.map((p) => [p.lat, p.lng] as [number, number])}
          pathOptions={
            route.length > 2
              ? { color: "#ff6b00", weight: 5, opacity: 0.85 }
              : { color: "#111827", weight: 4, dashArray: "8 8", opacity: 0.7 }
          }
        />
      )}
      {heat?.map((h) => (
        <Circle
          key={`${h.lat},${h.lng}`}
          center={[h.lat, h.lng]}
          radius={180 + 220 * (h.count / maxHeat)}
          pathOptions={{ color: "#ff6b00", weight: 0, fillColor: "#ff6b00", fillOpacity: 0.15 + 0.45 * (h.count / maxHeat) }}
        >
          <Tooltip direction="top">
            {h.count} demande{h.count > 1 ? "s" : ""}
          </Tooltip>
        </Circle>
      ))}
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
