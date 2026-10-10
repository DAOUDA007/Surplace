"use client";

import { useState } from "react";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { formatDateTime } from "@/lib/format";
import type { BroadcastRecord } from "@/lib/types";
import { Card, EmptyState, LoadingRows, PageError, PageHeader } from "./ui";

const inputClass = "w-full rounded-xl border border-line bg-surface px-3 text-sm";

/** Message envoyé à un groupe (tous les chauffeurs, chauffeurs en ligne, passagers…) : notification, push et SMS en option. */
export function BroadcastPage() {
  const { data, error, loading } = useAdminData<{ broadcasts: BroadcastRecord[]; audiences: { value: string; label: string }[] }>(
    "/api/admin/broadcasts",
    60_000,
  );
  const action = useAdminAction();
  const [form, setForm] = useState({ audience: "drivers-approved", title: "", message: "", sms: false });
  const [sent, setSent] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSent("");
    const ok = await action.run("send", "/api/admin/broadcasts", form);
    if (ok) {
      setSent("Message envoyé.");
      setForm((f) => ({ ...f, title: "", message: "" }));
    }
  }

  return (
    <>
      <PageHeader title="Messages groupés" subtitle="Informez tous les chauffeurs ou tous les passagers en une fois." />
      <PageError message={error || action.error} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Nouveau message">
          <form onSubmit={submit} className="space-y-3">
            <label className="block text-sm font-semibold">
              Destinataires
              <select
                value={form.audience}
                onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
                className={`${inputClass} mt-1 h-11`}
              >
                {(data?.audiences ?? []).map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <input
              required
              maxLength={80}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Titre (ex. Fête de l'indépendance)"
              className={`${inputClass} h-11`}
            />
            <textarea
              required
              maxLength={500}
              rows={4}
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              placeholder="Votre message…"
              className={`${inputClass} py-2`}
            />
            <p className="text-right text-xs text-muted">{form.message.length}/500</p>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={form.sms} onChange={(e) => setForm((f) => ({ ...f, sms: e.target.checked }))} className="mt-1" />
              <span>
                Envoyer aussi par SMS
                <span className="block text-xs text-muted">Pour les personnes sans l&apos;application ouverte. Chaque SMS peut être facturé par l&apos;opérateur.</span>
              </span>
            </label>
            {sent && <p className="rounded-xl bg-emerald-100 px-3 py-2 text-sm text-emerald-800">✅ {sent}</p>}
            <button
              type="submit"
              disabled={action.busy === "send"}
              className="w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {action.busy === "send" ? "Envoi…" : "Envoyer"}
            </button>
          </form>
        </Card>
        <Card title="Messages envoyés">
          {loading && !data ? (
            <LoadingRows />
          ) : !data?.broadcasts.length ? (
            <EmptyState icon="📣" title="Aucun message envoyé" />
          ) : (
            <ul className="space-y-3">
              {data.broadcasts.map((b) => (
                <li key={b.id} className="rounded-2xl bg-subtle p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold">{b.title}</p>
                    <span className="shrink-0 text-xs text-muted">{formatDateTime(b.createdAt)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-muted">{b.body}</p>
                  <p className="mt-2 text-xs text-muted">
                    {b.audience} · {b.recipients} destinataire(s){b.sms ? " · avec SMS" : ""} · par {b.adminName}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
