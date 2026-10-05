"use client";

import { useState } from "react";
import { Button, ErrorMessage } from "@/components/ui";
import { api } from "@/lib/api";
import { CONTACT_SUBJECTS } from "@/lib/site";

const inputClass =
  "w-full rounded-2xl border border-line bg-surface px-4 text-[15px] outline-none transition placeholder:text-faint focus:border-ink";

const EMPTY = { name: "", phone: "", subject: CONTACT_SUBJECTS[0], message: "" };

export function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/public/contact", form);
      setSent(true);
      setForm(EMPTY);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 rounded-3xl bg-surface p-8 text-center ring-1 ring-line">
        <p className="text-4xl">✅</p>
        <p className="text-xl font-extrabold">Message envoyé !</p>
        <p className="text-sm text-muted">Merci, notre équipe vous répondra au plus vite.</p>
        <Button variant="ghost" onClick={() => setSent(false)}>
          Envoyer un autre message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl bg-surface p-6 shadow-sm ring-1 ring-line">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Nom</span>
          <input required value={form.name} onChange={set("name")} placeholder="Votre nom" className={`${inputClass} h-12`} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">Téléphone ou e-mail</span>
          <input
            required
            value={form.phone}
            onChange={set("phone")}
            placeholder="Pour vous répondre"
            className={`${inputClass} h-12`}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Sujet</span>
        <select value={form.subject} onChange={set("subject")} className={`${inputClass} h-12`}>
          {CONTACT_SUBJECTS.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold">Message</span>
        <textarea
          required
          minLength={10}
          rows={4}
          value={form.message}
          onChange={set("message")}
          placeholder="Comment pouvons-nous vous aider ?"
          className={`${inputClass} py-3`}
        />
      </label>
      <ErrorMessage>{error}</ErrorMessage>
      <Button type="submit" loading={loading} className="w-full">
        Envoyer le message
      </Button>
    </form>
  );
}
