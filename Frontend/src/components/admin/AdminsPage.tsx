"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, ErrorMessage } from "@/components/ui";
import { useAdminAction, useAdminData } from "@/hooks/useAdminData";
import { api } from "@/lib/api";
import { formatPhone } from "@/lib/format";
import type { AdminAccount, User } from "@/lib/types";
import { ActionButton, Card, LoadingRows, PageError, PageHeader, TableWrap, td, th } from "./ui";

const inputClass =
  "h-11 w-full rounded-2xl border border-line bg-surface px-4 text-sm outline-none transition focus:border-ink";

function AddAdminForm({ onAdded }: { onAdded: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", pin: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api("/api/admin/admins", form);
      setForm({ name: "", phone: "", pin: "" });
      onAdded();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          required
          placeholder="Nom complet"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className={inputClass}
        />
        <input
          required
          type="tel"
          placeholder="Téléphone"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
          className={inputClass}
        />
        <input
          required
          inputMode="numeric"
          placeholder="Code PIN provisoire (4 chiffres)"
          value={form.pin}
          onChange={(e) => setForm((f) => ({ ...f, pin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
          className={inputClass}
        />
      </div>
      <p className="text-xs text-muted">
        Communiquez le code PIN provisoire au nouvel administrateur : il pourra le changer dans « Mon compte ».
      </p>
      <ErrorMessage>{error}</ErrorMessage>
      <Button type="submit" loading={loading} className="h-11 text-sm">
        Ajouter l&apos;administrateur
      </Button>
    </form>
  );
}

export function AdminsPage({ user }: { user: User }) {
  const router = useRouter();
  const { data, error, loading, refresh } = useAdminData<{ admins: AdminAccount[] }>("/api/admin/admins", 30_000);
  const action = useAdminAction();
  const principal = !!user.isPrincipal;

  async function transfer(id: number) {
    if (await action.run(`t-${id}`, `/api/admin/admins/${id}/transfer`)) {
      // Les droits ont changé : on recharge l'espace admin.
      router.refresh();
    }
  }

  return (
    <>
      <PageHeader
        title="Administrateurs"
        subtitle={
          principal
            ? "Vous êtes l'administrateur principal : vous seul pouvez ajouter, suspendre ou supprimer des administrateurs."
            : "Seul l'administrateur principal peut gérer les administrateurs. Cette liste est en lecture seule."
        }
      />
      <PageError message={error || action.error} />

      {principal && (
        <Card title="Ajouter un administrateur" className="mb-6">
          <AddAdminForm onAdded={refresh} />
        </Card>
      )}

      <Card title="Équipe d'administration">
        {loading && !data ? (
          <LoadingRows />
        ) : (
          <TableWrap minWidth={720}>
            <thead>
              <tr>
                <th className={th}>Administrateur</th>
                <th className={th}>Rôle</th>
                <th className={th}>Statut</th>
                <th className={th}>Ajouté le</th>
                {principal && <th className={`${th} text-right`}>Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data?.admins.map((a) => {
                const self = a.id === user.id;
                return (
                  <tr key={a.id} className={a.blocked ? "opacity-60" : ""}>
                    <td className={td}>
                      <p className="font-semibold">
                        {a.name}
                        {self && <span className="ml-2 text-xs font-normal text-muted">(vous)</span>}
                      </p>
                      <p className="text-xs text-muted">{formatPhone(a.phone)}</p>
                    </td>
                    <td className={td}>
                      {a.isPrincipal ? (
                        <span className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-bold text-white">👑 Principal</span>
                      ) : (
                        <span className="text-muted">Administrateur</span>
                      )}
                    </td>
                    <td className={td}>
                      {a.blocked ? (
                        <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Suspendu</span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">Actif</span>
                      )}
                    </td>
                    <td className={td}>{new Date(a.createdAt).toLocaleDateString("fr-FR")}</td>
                    {principal && (
                      <td className={`${td} text-right`}>
                        {!self && (
                          <span className="inline-flex flex-wrap justify-end gap-3">
                            {!a.blocked && (
                              <ActionButton
                                tone="brand"
                                confirm="Confirmer la cession"
                                disabled={action.busy === `t-${a.id}`}
                                onClick={() => transfer(a.id)}
                              >
                                Céder le rôle principal
                              </ActionButton>
                            )}
                            {a.blocked ? (
                              <ActionButton
                                tone="success"
                                onClick={() => action.run(`b-${a.id}`, `/api/admin/admins/${a.id}/block`, { blocked: false })}
                              >
                                Réactiver
                              </ActionButton>
                            ) : (
                              <ActionButton
                                tone="danger"
                                confirm="Confirmer la suspension"
                                onClick={() => action.run(`b-${a.id}`, `/api/admin/admins/${a.id}/block`, { blocked: true })}
                              >
                                Suspendre
                              </ActionButton>
                            )}
                            <ActionButton
                              tone="danger"
                              confirm="Confirmer la suppression"
                              onClick={() => action.run(`d-${a.id}`, `/api/admin/admins/${a.id}/delete`)}
                            >
                              Supprimer
                            </ActionButton>
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
        )}
      </Card>
      {principal && (
        <p className="mt-4 text-xs text-muted">
          En cédant le rôle principal, vous restez administrateur mais vous ne pourrez plus gérer l&apos;équipe.
        </p>
      )}
    </>
  );
}
