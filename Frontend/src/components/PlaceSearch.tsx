"use client";

import { useEffect, useState } from "react";
import { searchAddress, searchPopularPlaces } from "@/lib/places";
import type { Place } from "@/lib/types";

interface Props {
  kind: "pickup" | "dropoff";
  value: Place | null;
  onChange: (place: Place) => void;
  placeholder: string;
  /** Le champ est la cible des clics sur la carte. */
  active: boolean;
  onActivate: () => void;
  action?: React.ReactNode;
}

export function PlaceSearch({ kind, value, onChange, placeholder, active, onActivate, action }: Props) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [focused, setFocused] = useState(false);
  const [remote, setRemote] = useState<Place[]>([]);
  const [searching, setSearching] = useState(false);

  // Le lieu peut aussi être choisi sur la carte : on synchronise le texte.
  useEffect(() => {
    setQuery(value?.label ?? "");
  }, [value]);

  useEffect(() => {
    const q = query.trim();
    if (!focused || q.length < 3 || q === value?.label) {
      setRemote([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        setRemote(await searchAddress(q, controller.signal));
      } catch {
        setRemote([]);
      } finally {
        setSearching(false);
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, focused, value]);

  const local = searchPopularPlaces(query === value?.label ? "" : query);
  const suggestions = [...local, ...remote.filter((r) => !local.some((l) => l.label === r.label))];

  function select(place: Place) {
    onChange(place);
    setQuery(place.label);
    setFocused(false);
  }

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-2xl border-2 bg-subtle px-3 transition ${
          active ? "border-ink bg-surface" : "border-transparent"
        }`}
      >
        <span
          className={`h-2.5 w-2.5 shrink-0 ${kind === "pickup" ? "rounded-full bg-green-600" : "rounded-sm bg-red-600"}`}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setFocused(true);
            onActivate();
          }}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder={placeholder}
          className="h-12 min-w-0 flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-faint"
        />
        {action}
      </div>
      {focused && (suggestions.length > 0 || searching) && (
        <ul className="absolute inset-x-0 top-full z-[1200] mt-1 max-h-64 overflow-auto rounded-2xl bg-surface py-1 shadow-xl ring-1 ring-line">
          {suggestions.map((p) => (
            <li key={`${p.label}-${p.lat}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(p)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-subtle"
              >
                <span aria-hidden>📍</span>
                <span className="truncate">{p.label}</span>
              </button>
            </li>
          ))}
          {searching && <li className="px-4 py-2 text-xs text-muted">Recherche…</li>}
        </ul>
      )}
    </div>
  );
}
