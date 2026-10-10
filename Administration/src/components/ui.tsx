// ⚠️ Fichier copié depuis Commun/components/ui.tsx par scripts/sync-commun.mjs : modifiez l'original dans Commun/.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/format";
import type { RideStatus } from "@/lib/types";

type Variant = "primary" | "dark" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark",
  dark: "bg-contrast text-on-contrast hover:opacity-90",
  ghost: "bg-subtle text-ink hover:bg-line",
  danger: "bg-red-50 text-red-700 hover:bg-red-100",
};

export function Button({
  variant = "primary",
  loading,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={`inline-flex h-12 items-center justify-center gap-2 rounded-2xl px-5 font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}

export function StatusBadge({ status }: { status: RideStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{children}</p>;
}

/** Départ → destination, présentés verticalement. */
export function Route({ from, to }: { from: string; to: string }) {
  return (
    <div className="grid grid-cols-[14px_1fr] items-start gap-x-3 text-sm">
      <span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-green-600" />
      <p className="truncate font-medium" title={from}>
        {from}
      </p>
      <span className="mx-auto my-0.5 h-4 w-px bg-faint" />
      <span />
      <span className="mt-1.5 h-2.5 w-2.5 rounded-sm bg-red-600" />
      <p className="truncate font-medium" title={to}>
        {to}
      </p>
    </div>
  );
}

export function Stars({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-muted">Nouveau</span>;
  return (
    <span className="text-sm font-semibold">
      <span className="text-amber-500">★</span> {value.toFixed(1)}
    </span>
  );
}
