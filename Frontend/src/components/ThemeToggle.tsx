"use client";

import { useEffect, useState } from "react";
import { THEME_STORAGE_KEY as STORAGE_KEY } from "@/lib/theme";

type Theme = "light" | "dark" | "system";

const ORDER: Theme[] = ["light", "dark", "system"];
const LABELS: Record<Theme, { icon: string; label: string }> = {
  light: { icon: "☀️", label: "Clair" },
  dark: { icon: "🌙", label: "Sombre" },
  system: { icon: "🖥️", label: "Auto" },
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

  const current = LABELS[theme ?? "system"];
  return (
    <button
      type="button"
      onClick={next}
      title={`Thème : ${current.label} (cliquer pour changer)`}
      aria-label={`Thème : ${current.label}`}
      className={`inline-flex items-center gap-2 ${className}`}
    >
      <span aria-hidden>{theme ? current.icon : "🌓"}</span>
      {withLabel && <span>Thème : {theme ? current.label : "…"}</span>}
    </button>
  );
}
