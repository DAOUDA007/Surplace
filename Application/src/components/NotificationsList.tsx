"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { enablePush, pushSupported } from "@/lib/push";
import type { AppNotification } from "@/lib/types";

/** Liste des notifications (abonnement, validation, réponses aux réclamations, messages de l'équipe…). */
export function NotificationsList() {
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [canAskPush, setCanAskPush] = useState(false);

  useEffect(() => {
    api<{ items: AppNotification[] }>("/api/me/notifications")
      .then((d) => {
        setItems(d.items);
        // Ouvrir la page marque tout comme lu.
        api("/api/me/notifications/read", {}).catch(() => null);
      })
      .catch(() => setItems([]));
    setCanAskPush(pushSupported() && Notification.permission === "default");
  }, []);

  return (
    <div className="mt-6 space-y-3">
      {canAskPush && (
        <button
          type="button"
          onClick={async () => {
            setCanAskPush(false);
            await enablePush().catch(() => null);
          }}
          className="w-full rounded-2xl bg-sky-50 p-4 text-left text-sm text-sky-800"
        >
          📳 <strong>Recevoir aussi les notifications sur le téléphone</strong>, même quand l&apos;application est fermée.
        </button>
      )}
      {items === null ? (
        <div className="h-32 animate-pulse rounded-3xl bg-subtle" />
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-muted">Aucune notification pour le moment.</p>
      ) : (
        items.map((n) => {
          const body = (
            <div className={`rounded-3xl p-4 shadow-sm ring-1 ring-line ${n.readAt ? "bg-surface" : "bg-brand-soft"}`}>
              <div className="flex items-start justify-between gap-3">
                <p className="font-bold">{n.title}</p>
                <span className="shrink-0 text-xs text-muted">{timeAgo(n.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{n.body}</p>
            </div>
          );
          return n.url ? (
            <Link key={n.id} href={n.url} className="block">
              {body}
            </Link>
          ) : (
            <div key={n.id}>{body}</div>
          );
        })
      )}
    </div>
  );
}
