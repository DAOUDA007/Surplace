"use client";

import { useState } from "react";
import { Button, ErrorMessage } from "@/components/ui";
import { api } from "@/lib/api";
import { COMPLAINT_CATEGORIES } from "@/lib/types";

/** « Signaler un problème » sur une course (objet perdu, prix, comportement…). La réponse arrive dans 🔔. */
export function ComplaintButton({ rideId }: { rideId?: number }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(COMPLAINT_CATEGORIES[0]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/complaints", { rideId, category, message });
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) return <p className="text-sm font-semibold text-emerald-700">✅ Réclamation envoyée. Réponse dans vos notifications 🔔.</p>;
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-muted underline-offset-2 hover:underline">
        Signaler un problème
      </button>
    );
  }
  return (
    <form onSubmit={submit} className="space-y-2 rounded-2xl bg-subtle p-3">
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
      >
        {COMPLAINT_CATEGORIES.map((c) => (
          <option key={c}>{c}</option>
        ))}
      </select>
      <textarea
        required
        minLength={10}
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Décrivez le problème…"
        className="w-full rounded-xl border border-line bg-surface p-3 text-sm outline-none focus:border-ink"
      />
      <ErrorMessage>{error}</ErrorMessage>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="h-10 flex-1">
          Annuler
        </Button>
        <Button type="submit" loading={loading} className="h-10 flex-1">
          Envoyer
        </Button>
      </div>
    </form>
  );
}
