"use client";

import { useEffect, useState } from "react";
import { ErrorMessage } from "@/components/ui";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className = "",
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-line ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-lg font-extrabold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl p-4 shadow-sm ring-1 ${highlight ? "bg-amber-50 ring-amber-200" : "bg-surface ring-line"}`}
    >
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  );
}

/** Onglets de filtre (statut). */
export function FilterTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-2xl bg-subtle p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
            value === o.value ? "bg-surface shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
          {o.count != null && o.count > 0 && (
            <span className="ml-1.5 rounded-full bg-red-600 px-1.5 text-xs text-white">{o.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Champ de recherche avec un léger délai, pour ne pas interroger le serveur à chaque frappe. */
export function SearchInput({
  onSearch,
  placeholder,
}: {
  onSearch: (q: string) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  useEffect(() => {
    const t = setTimeout(() => onSearch(value.trim()), 350);
    return () => clearTimeout(t);
  }, [value, onSearch]);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint">🔍</span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-2xl border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-ink sm:w-72"
      />
    </div>
  );
}

export function EmptyState({ icon, title, text }: { icon: string; title: string; text?: string }) {
  return (
    <div className="py-10 text-center">
      <p className="text-4xl">{icon}</p>
      <p className="mt-2 font-bold">{title}</p>
      {text && <p className="text-sm text-muted">{text}</p>}
    </div>
  );
}

export function LoadingRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-2xl bg-subtle" />
      ))}
    </div>
  );
}

export function PageError({ message }: { message: string }) {
  return message ? (
    <div className="mb-4">
      <ErrorMessage>{message}</ErrorMessage>
    </div>
  ) : null;
}

const TONES = {
  brand: "text-brand",
  danger: "text-red-600",
  success: "text-emerald-700",
  muted: "text-muted",
};

/**
 * Bouton d'action discret. Avec `confirm`, un premier clic demande confirmation
 * (actions sensibles : suspendre, bloquer, annuler…).
 */
export function ActionButton({
  onClick,
  children,
  tone = "brand",
  confirm,
  disabled,
}: {
  onClick: () => void;
  children: React.ReactNode;
  tone?: keyof typeof TONES;
  confirm?: string;
  disabled?: boolean;
}) {
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (!asking) return;
    const t = setTimeout(() => setAsking(false), 4000);
    return () => clearTimeout(t);
  }, [asking]);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (confirm && !asking) {
          setAsking(true);
          return;
        }
        setAsking(false);
        onClick();
      }}
      className={`whitespace-nowrap text-xs font-semibold hover:underline disabled:opacity-50 ${
        asking ? "rounded-full bg-red-600 px-2 py-0.5 text-white no-underline" : TONES[tone]
      }`}
    >
      {asking ? confirm : children}
    </button>
  );
}

export function TableWrap({ children, minWidth = 760 }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export const th = "py-2 pr-3 text-xs font-semibold uppercase tracking-wide text-muted";
export const td = "py-3 pr-3 align-top";
