"use client";

import { useState } from "react";
import { MapView, type MapMarker } from "@/components/MapView";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import type { AdminPlace, LatLng } from "@/lib/types";
import { ActionButton, Card, LoadingRows, PageError, PageHeader, TableWrap, td, th } from "./ui";

/** Lieux fréquents proposés aux passagers dans la recherche (gare, marché, quartiers…). */
export function PlacesPage() {
  const { data, error, loading } = useAdminData<{ places: AdminPlace[] }>("/api/admin/places", 60_000);
  const action = useAdminAction();
  const [draft, setDraft] = useState<{ label: string; point: LatLng | null }>({ label: "", point: null });
  const [editing, setEditing] = useState<AdminPlace | null>(null);
  const places = data?.places ?? [];

  const markers: MapMarker[] = places
    .filter((p) => p.active)
    .map((p) => ({ id: `p-${p.id}`, kind: "pickup", position: p, label: p.label, onClick: () => setEditing(p) }));
  if (draft.point) markers.push({ id: "draft", kind: "request", position: draft.point, label: "Nouveau lieu" });
  if (editing) {
    markers.push({
      id: "edit",
      kind: "dropoff",
      position: editing,
      label: `${editing.label} (déplaçable)`,
      onDragEnd: (p) => setEditing({ ...editing, ...p }),
    });
  }

  async function add() {
    if (!draft.point) return;
    if (await action.run("add", "/api/admin/places", { label: draft.label, ...draft.point })) setDraft({ label: "", point: null });
  }

  return (
    <>
      <PageHeader
        title="Lieux fréquents"
        subtitle="Proposés en premier aux passagers quand ils cherchent un départ ou une destination."
      />
      <PageError message={error || action.error} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <Card title="Carte" className="h-[460px]">
          <div className="h-[380px] overflow-hidden rounded-2xl">
            <MapView
              markers={markers}
              fitTo={places.length ? places.map((p) => ({ lat: p.lat, lng: p.lng })) : []}
              onMapClick={(p) => (editing ? setEditing({ ...editing, ...p }) : setDraft((d) => ({ ...d, point: p })))}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Touchez la carte pour placer un nouveau lieu. Touchez un point vert pour le modifier (vous pouvez le faire glisser).
          </p>
        </Card>
        <div className="space-y-4">
          {editing ? (
            <Card title="Modifier le lieu">
              <div className="space-y-3">
                <input
                  value={editing.label}
                  onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                  className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
                />
                <p className="text-xs text-muted">
                  {editing.lat.toFixed(5)}, {editing.lng.toFixed(5)}
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked ? 1 : 0 })}
                  />
                  Proposé aux passagers
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-xl bg-subtle py-2 text-sm font-semibold">
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await action.run(`e-${editing.id}`, `/api/admin/places/${editing.id}`, {
                        label: editing.label,
                        lat: editing.lat,
                        lng: editing.lng,
                        active: !!editing.active,
                        sort: editing.sort,
                      });
                      if (ok) setEditing(null);
                    }}
                    className="flex-1 rounded-xl bg-brand py-2 text-sm font-semibold text-white"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </Card>
          ) : (
            <Card title="Ajouter un lieu">
              <div className="space-y-3">
                <input
                  value={draft.label}
                  onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                  placeholder="Nom (ex. Marché de Soba)"
                  className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
                />
                <p className="text-xs text-muted">
                  {draft.point ? `Position : ${draft.point.lat.toFixed(5)}, ${draft.point.lng.toFixed(5)}` : "Touchez la carte pour choisir la position."}
                </p>
                <button
                  type="button"
                  disabled={!draft.point || !draft.label.trim() || action.busy === "add"}
                  onClick={add}
                  className="w-full rounded-xl bg-brand py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Ajouter
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card title={`${places.length} lieu(x)`} className="mt-6">
        {loading && !data ? (
          <LoadingRows />
        ) : (
          <TableWrap minWidth={560}>
            <thead>
              <tr>
                <th className={th}>Nom</th>
                <th className={th}>Position</th>
                <th className={th}>Proposé</th>
                <th className={`${th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {places.map((p) => (
                <tr key={p.id} className={p.active ? "" : "opacity-60"}>
                  <td className={`${td} font-semibold`}>{p.label}</td>
                  <td className={`${td} text-xs text-muted`}>
                    {p.lat.toFixed(4)}, {p.lng.toFixed(4)}
                  </td>
                  <td className={td}>{p.active ? "Oui" : "Non"}</td>
                  <td className={`${td} space-x-3 text-right`}>
                    <ActionButton onClick={() => setEditing(p)}>Modifier</ActionButton>
                    <ActionButton onClick={() => action.run(`d-${p.id}`, `/api/admin/places/${p.id}/delete`)} tone="danger" confirm="Confirmer la suppression">
                      Supprimer
                    </ActionButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
