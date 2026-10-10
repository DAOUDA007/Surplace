"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { InstallButton } from "@/components/PwaSetup";
import { useServerEvents } from "@/hooks/useServerEvents";
import { api } from "@/lib/api";
import {
  isBatterySaver,
  isSimpleMode,
  isVoiceEnabled,
  setBatterySaver,
  setSimpleMode,
  setVoiceEnabled,
  setVoiceLanguage,
  VOICE_LANGUAGES,
  voiceLanguage,
  type VoiceLanguage,
} from "@/lib/preferences";
import { currentPushSubscription, disablePush, enablePush, pushSupported, refreshPushSubscription } from "@/lib/push";
import { ThemeToggle } from "./ThemeToggle";

export interface MenuLink {
  href: string;
  label: string;
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm hover:bg-subtle">
      <span>
        {label}
        {hint && <span className="block text-xs text-muted">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-[var(--color-brand)]" />
    </label>
  );
}

/** Menu utilisateur (liens, notifications, réglages, déconnexion) affiché en haut des écrans connectés. */
export function AppMenu({ name, links, role }: { name: string; links: MenuLink[]; role?: "passenger" | "driver" }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [prefs, setPrefs] = useState({ simple: false, voice: false, lang: "fr" as VoiceLanguage, saver: false, push: false });
  const router = useRouter();

  const loadUnread = useCallback(() => {
    api<{ unread: number }>("/api/me/notifications")
      .then((d) => setUnread(d.unread))
      .catch(() => null);
  }, []);

  useEffect(() => {
    loadUnread();
    refreshPushSubscription();
  }, [loadUnread]);

  useServerEvents((event) => {
    if (event.type === "notification") loadUnread();
  });

  useEffect(() => {
    if (!open) return;
    currentPushSubscription().then((s) =>
      setPrefs({ simple: isSimpleMode(), voice: isVoiceEnabled(), lang: voiceLanguage(), saver: isBatterySaver(), push: !!s }),
    );
  }, [open]);

  async function logout() {
    await disablePush().catch(() => null);
    await api("/api/auth/logout", {}).catch(() => null);
    router.replace("/");
    router.refresh();
  }

  return (
    <div className="relative flex items-center gap-2">
      <Link
        href="/notifications"
        className="relative grid h-11 w-11 place-items-center rounded-full bg-surface text-lg shadow-md"
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
      >
        🔔
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
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
        <div className="absolute right-0 top-full z-[1100] mt-2 max-h-[75dvh] w-72 overflow-y-auto rounded-2xl bg-surface shadow-xl ring-1 ring-line">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="block px-4 py-3 text-sm hover:bg-subtle" onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <div className="border-t border-line py-1">
            <p className="px-4 pt-2 text-xs font-semibold uppercase tracking-wide text-muted">Réglages</p>
            <ThemeToggle withLabel className="w-full px-4 py-2.5 text-left text-sm hover:bg-subtle" />
            <Toggle
              label="🔍 Mode simple"
              hint="Textes et boutons plus grands"
              checked={prefs.simple}
              onChange={(v) => {
                setSimpleMode(v);
                setPrefs((p) => ({ ...p, simple: v }));
              }}
            />
            <Toggle
              label="🔊 Annonces vocales"
              hint="L'application annonce les étapes à voix haute"
              checked={prefs.voice}
              onChange={(v) => {
                setVoiceEnabled(v);
                setPrefs((p) => ({ ...p, voice: v }));
              }}
            />
            {prefs.voice && (
              <div className="flex gap-1 px-4 pb-2">
                {VOICE_LANGUAGES.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    onClick={() => {
                      setVoiceLanguage(l.value);
                      setPrefs((p) => ({ ...p, lang: l.value }));
                    }}
                    className={`flex-1 rounded-lg px-2 py-1 text-xs font-semibold ${prefs.lang === l.value ? "bg-contrast text-on-contrast" : "bg-subtle"}`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
            {pushSupported() && (
              <Toggle
                label="📳 Notifications sur le téléphone"
                hint="Même quand l'application est fermée"
                checked={prefs.push}
                onChange={async (v) => {
                  const ok = v ? await enablePush().catch(() => false) : (await disablePush(), false);
                  setPrefs((p) => ({ ...p, push: v && !!ok }));
                }}
              />
            )}
            {role === "driver" && (
              <Toggle
                label="🔋 Économie de batterie"
                hint="Position envoyée moins souvent"
                checked={prefs.saver}
                onChange={(v) => {
                  setBatterySaver(v);
                  setPrefs((p) => ({ ...p, saver: v }));
                }}
              />
            )}
            <InstallButton className="w-full px-4 py-2.5 text-left text-sm font-semibold text-brand hover:bg-subtle" />
          </div>
          <button onClick={logout} className="block w-full border-t border-line px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50">
            Se déconnecter
          </button>
        </div>
      )}
    </div>
  );
}
