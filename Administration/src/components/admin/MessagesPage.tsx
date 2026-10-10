"use client";

import { useState } from "react";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { formatDateTime } from "@/lib/format";
import type { ContactMessage } from "@/lib/types";
import { ActionButton, Card, EmptyState, FilterTabs, LoadingRows, PageError, PageHeader } from "./ui";

type Filter = "todo" | "done" | "all";

/** Lien d'appel ou d'e-mail selon ce que l'expéditeur a saisi. */
function replyLink(contact: string) {
  if (contact.includes("@")) return `mailto:${contact}`;
  const digits = contact.replace(/[^\d+]/g, "");
  return digits.length >= 8 ? `tel:${digits}` : null;
}

export function MessagesPage() {
  const { data, error, loading } = useAdminData<{ messages: ContactMessage[] }>("/api/admin/messages");
  const action = useAdminAction();
  const [filter, setFilter] = useState<Filter>("todo");

  if (loading && !data) return <LoadingRows />;
  if (!data) return <PageError message={error} />;

  const todoCount = data.messages.filter((m) => !m.handled).length;
  const messages = data.messages.filter((m) => (filter === "todo" ? !m.handled : filter === "done" ? m.handled : true));

  return (
    <>
      <PageHeader title="Messages" subtitle="Messages envoyés depuis le formulaire « Nous contacter » du site." />
      <PageError message={error || action.error} />
      <Card>
        <div className="mb-4">
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "todo", label: "À traiter", count: todoCount },
              { value: "done", label: "Traités" },
              { value: "all", label: "Tous" },
            ]}
          />
        </div>
        {messages.length === 0 ? (
          <EmptyState
            icon="📭"
            title={filter === "todo" ? "Aucun message à traiter" : "Aucun message"}
            text={filter === "todo" ? "Bravo, la boîte de réception est vide." : undefined}
          />
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const link = replyLink(m.phone);
              return (
                <li key={m.id} className={`rounded-2xl p-4 ${m.handled ? "bg-subtle opacity-70" : "bg-brand-soft"}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{m.subject}</p>
                      <p className="text-sm text-muted">
                        {m.name} ·{" "}
                        {link ? (
                          <a href={link} className="font-semibold text-brand hover:underline">
                            {m.phone}
                          </a>
                        ) : (
                          m.phone
                        )}
                      </p>
                    </div>
                    <span className="text-xs text-muted">{formatDateTime(m.createdAt)}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
                  <div className="mt-3 flex gap-4">
                    <ActionButton
                      tone={m.handled ? "muted" : "success"}
                      disabled={action.busy === `m-${m.id}`}
                      onClick={() => action.run(`m-${m.id}`, `/api/admin/messages/${m.id}`, { handled: !m.handled })}
                    >
                      {m.handled ? "Remettre à traiter" : "✓ Marquer comme traité"}
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      confirm="Confirmer la suppression"
                      disabled={action.busy === `d-${m.id}`}
                      onClick={() => action.run(`d-${m.id}`, `/api/admin/messages/${m.id}/delete`)}
                    >
                      Supprimer
                    </ActionButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
