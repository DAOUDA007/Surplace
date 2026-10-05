"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAdminData } from "@/hooks/useAdminData";
import { api } from "@/lib/api";
import type { AdminCounts, User } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: keyof AdminCounts;
  /** Pastille neutre (information) plutôt que rouge (action requise). */
  info?: boolean;
}

const NAV: { title?: string; items: NavItem[] }[] = [
  { items: [{ href: "/admin", label: "Vue d'ensemble", icon: "📊" }] },
  {
    title: "Activité",
    items: [{ href: "/admin/courses", label: "Courses", icon: "🏍️", badge: "activeRides", info: true }],
  },
  {
    title: "Utilisateurs",
    items: [
      { href: "/admin/chauffeurs", label: "Chauffeurs", icon: "🪪", badge: "driversPending" },
      { href: "/admin/passagers", label: "Passagers", icon: "🙋" },
    ],
  },
  {
    title: "Finances",
    items: [{ href: "/admin/abonnements", label: "Abonnements", icon: "💳", badge: "subscriptionsPending" }],
  },
  {
    title: "Relation client",
    items: [
      { href: "/admin/avis", label: "Avis", icon: "⭐" },
      { href: "/admin/messages", label: "Messages", icon: "✉️", badge: "messagesUnread" },
    ],
  },
  {
    title: "Paramètres",
    items: [
      { href: "/admin/administrateurs", label: "Administrateurs", icon: "🛡️" },
      { href: "/admin/compte", label: "Mon compte", icon: "⚙️" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminShell({ user, children }: { user: User; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: counts } = useAdminData<AdminCounts>("/api/admin/counts", 15_000);

  // Le tiroir mobile se ferme à chaque changement de page.
  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    await api("/api/auth/logout", {}).catch(() => null);
    router.replace("/");
    router.refresh();
  }

  const current = NAV.flatMap((g) => g.items).find((i) => isActive(pathname, i.href));
  const totalAlerts = counts ? counts.driversPending + counts.subscriptionsPending + counts.messagesUnread : 0;

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-5 py-5">
        <Logo href="/admin" />
        <span className="rounded-full bg-contrast px-2 py-0.5 text-[11px] font-bold text-on-contrast">Admin</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((group, i) => (
          <div key={i}>
            {group.title && (
              <p className="mb-1 px-3 text-[11px] font-bold uppercase tracking-wider text-faint">{group.title}</p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const badge = item.badge && counts ? counts[item.badge] : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
                        active ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-subtle hover:text-ink"
                      }`}
                    >
                      <span className="w-5 text-center" aria-hidden>
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {badge > 0 && (
                        <span
                          className={`min-w-5 rounded-full px-1.5 text-center text-xs font-bold ${
                            active
                              ? "bg-white text-brand"
                              : item.info
                                ? "bg-subtle text-ink ring-1 ring-line"
                                : "bg-red-600 text-white"
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-line p-3">
        <div className="flex items-center gap-3 px-3 py-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-contrast text-sm font-bold text-on-contrast">
            {user.name.charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{user.name}</span>
            <span className="block text-xs text-muted">{user.isPrincipal ? "👑 Admin principal" : "Administrateur"}</span>
          </span>
        </div>
        <ThemeToggle withLabel className="w-full rounded-2xl px-3 py-2 text-left text-sm text-muted hover:bg-subtle" />
        <Link href="/" className="block rounded-2xl px-3 py-2 text-sm text-muted hover:bg-subtle">
          🌐 Voir le site
        </Link>
        <button
          onClick={logout}
          className="block w-full rounded-2xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
        >
          ↩ Se déconnecter
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh lg:pl-64">
      {/* Menu fixe sur grand écran */}
      <aside className="fixed inset-y-0 left-0 z-[1100] hidden w-64 border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {/* Tiroir sur mobile et tablette */}
      {open && (
        <div className="fixed inset-0 z-[1200] lg:hidden">
          <button
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <header className="sticky top-0 z-[1000] flex items-center gap-3 border-b border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="relative grid h-10 w-10 place-items-center rounded-xl bg-subtle text-lg"
          aria-label="Ouvrir le menu"
        >
          ☰
          {totalAlerts > 0 && (
            <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1 text-xs font-bold text-white">
              {totalAlerts}
            </span>
          )}
        </button>
        <span className="font-bold">
          {current?.icon} {current?.label ?? "Administration"}
        </span>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-8">{children}</main>
    </div>
  );
}
