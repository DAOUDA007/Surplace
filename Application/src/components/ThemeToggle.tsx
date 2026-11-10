"use client";
// ⚠️ Fichier copié depuis Commun/components/ThemeToggle.tsx par scripts/sync-commun.mjs : modifiez l'original dans Commun/.

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "@/lib/theme";

type Theme = "light" | "dark" | "system";

const ORDER: Theme[] = ["light", "dark", "system"];
const LABELS: Record<Theme, string> = { light: "Clair", dark: "Sombre", system: "Auto" };

/** Rond vide (clair), plein (sombre) ou à moitié rempli (automatique), qui tourne à chaque changement. */
const DISC: Record<Theme, { fill: string; turn: number }> = {
  light: { fill: "transparent", turn: 0 },
  dark: { fill: "currentColor", turn: 180 },
  system: { fill: "linear-gradient(90deg, currentColor 50%, transparent 50%)", turn: 360 },
};

function readTheme(): Theme {
  try {
    const t = localStorage.getItem(STORAGE_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

function apply(theme: Theme) {
  const dark =
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
}

/** Bouton qui alterne entre thème clair, sombre et automatique (selon l'appareil). */
export function ThemeToggle({ className = "", withLabel = false }: { className?: string; withLabel?: boolean }) {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  // En mode automatique, on suit les changements de réglage de l'appareil.
  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  function next() {
    const current = theme ?? "system";
    const value = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Stockage indisponible : le choix vaut pour cette page seulement.
    }
    apply(value);
    setTheme(value);
  }

  const label = LABELS[theme ?? "system"];
  const disc = DISC[theme ?? "system"];
  return (
    <button
      type="button"
      onClick={next}
      title={`Thème : ${label} (cliquer pour changer)`}
      aria-label={`Thème : ${label}`}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span
        aria-hidden
        className="inline-block h-4 w-4 shrink-0 rounded-full border-2 border-current transition-transform duration-500"
        style={{ background: disc.fill, transform: `rotate(${disc.turn}deg)` }}
      />
      {withLabel && <span>Thème : {theme ? label : "…"}</span>}
    </button>
  );
}
