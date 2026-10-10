"use client";

import { useState } from "react";
import { useAdminData } from "@/hooks/useAdminData";
import { formatDateTime } from "@/lib/format";
import type { AuditEntry } from "@/lib/types";
import { Card, EmptyState, LoadingRows, PageError, PageHeader, SearchInput, TableWrap, td, th } from "./ui";

function details(text: string | null) {
  if (!text) return "";
  try {
    const obj = JSON.parse(text) as Record<string, unknown>;
    return Object.entries(obj)
      .map(([k, v]) => `${k} : ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
      .join(" · ");
  } catch {
    return text;
  }
}

/** Qui a fait quoi, et quand : toutes les actions des administrateurs. */
export function AuditPage() {
  const [q, setQ] = useState("");
  const { data, error, loading } = useAdminData<{ entries: AuditEntry[] }>(`/api/admin/audit?q=${encodeURIComponent(q)}`, 30_000);
  const entries = data?.entries ?? [];

  return (
    <>
      <PageHeader
        title="Journal des actions"
        subtitle="Validations, suspensions, encaissements, suppressions, réglages… 300 dernières actions."
        actions={<SearchInput onSearch={setQ} placeholder="Administrateur, action, n°…" />}
      />
      <PageError message={error} />
      <Card>
        {loading && !data ? (
          <LoadingRows />
        ) : entries.length === 0 ? (
          <EmptyState icon="🗂️" title="Aucune action enregistrée" />
        ) : (
          <TableWrap minWidth={760}>
            <thead>
              <tr>
                <th className={th}>Date</th>
                <th className={th}>Administrateur</th>
                <th className={th}>Action</th>
                <th className={th}>Sur</th>
                <th className={th}>Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className={`${td} whitespace-nowrap text-xs text-muted`}>{formatDateTime(e.createdAt)}</td>
                  <td className={`${td} font-semibold`}>{e.adminName}</td>
                  <td className={td}>{e.action}</td>
                  <td className={`${td} text-sm`}>{e.target ?? "—"}</td>
                  <td className={`${td} max-w-xs truncate text-xs text-muted`} title={details(e.details)}>
                    {details(e.details)}
                  </td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Card>
    </>
  );
}
