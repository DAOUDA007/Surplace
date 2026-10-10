"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { ThemeToggle } from "./ThemeToggle";

export interface MenuLink {
  href: string;
  label: string;
}

/** Menu utilisateur (liens + déconnexion) affiché en haut des écrans connectés. */
export function AppMenu({ name, links }: { name: string; links: MenuLink[] }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function logout() {
    await api("/api/auth/logout", {}).catch(() => null);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 items-center gap-2 rounded-full bg-surface px-3 font-semibold shadow-md"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-contrast text-sm text-on-contrast">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-28 truncate text-sm">{name.split(" ")[0]}</span>
        <span aria-hidden>☰</span>
      </button>
      {open && (
        <div className="absolute right-0 z-[1100] mt-2 w-52 overflow-hidden rounded-2xl bg-surface shadow-xl ring-1 ring-line">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="block px-4 py-3 text-sm hover:bg-subtle"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <ThemeToggle withLabel className="w-full px-4 py-3 text-left text-sm hover:bg-subtle" />
          <button
            onClick={logout}
            className="block w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50"
          >
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
