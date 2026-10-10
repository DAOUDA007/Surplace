import Link from "next/link";
import { forwardRef } from "react";
import { AppMenu, type MenuLink } from "./AppMenu";
import { Logo } from "./Logo";

/** Écran plein : carte en fond, barre en haut, panneau en bas (mobile) ou à gauche (ordinateur). */
export function AppShell({
  name,
  links,
  map,
  topCenter,
  role,
  children,
}: {
  /** Absent pour un visiteur non connecté : un bouton « Se connecter » remplace le menu. */
  name?: string;
  links: MenuLink[];
  map: React.ReactNode;
  topCenter?: React.ReactNode;
  role?: "passenger" | "driver";
  children: React.ReactNode;
}) {
  return (
    <div className="relative h-dvh w-full overflow-hidden">
      <div className="absolute inset-0 z-0">{map}</div>
      <header className="pointer-events-none absolute inset-x-0 top-0 z-[1000] flex items-start justify-between gap-2 p-3">
        <div className="pointer-events-auto rounded-full bg-surface px-3 py-1 shadow-md">
          <Logo />
        </div>
        {topCenter && <div className="pointer-events-auto">{topCenter}</div>}
        <div className="pointer-events-auto">
          {name ? (
            <AppMenu name={name} links={links} role={role} />
          ) : (
            <Link
              href="/connexion"
              className="flex h-11 items-center rounded-full bg-surface px-4 text-sm font-semibold shadow-md"
            >
              Se connecter
            </Link>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

export const Sheet = forwardRef<HTMLDivElement, { children: React.ReactNode }>(function Sheet({ children }, ref) {
  return (
    <div
      ref={ref}
      className="absolute inset-x-0 bottom-0 z-[1000] max-h-[72dvh] overflow-y-auto rounded-t-3xl bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_rgb(0_0_0/0.12)] md:inset-x-auto md:bottom-auto md:left-4 md:top-20 md:max-h-[calc(100dvh-6rem)] md:w-[400px] md:rounded-3xl md:shadow-xl"
    >
      <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line md:hidden" />
      {children}
    </div>
  );
});
