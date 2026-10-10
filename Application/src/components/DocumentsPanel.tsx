"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { DOCUMENT_LABELS, EXPIRING_DOCUMENTS, REQUIRED_DOCUMENTS, type DocumentType, type DriverDocument } from "@/lib/types";

const ORDER: DocumentType[] = ["photo", "license", "registration", "id_card", "insurance"];

const HINTS: Record<DocumentType, string> = {
  photo: "Visage bien visible, sans casque ni lunettes de soleil. Elle sera montrée aux passagers.",
  license: "Recto du permis, lisible.",
  registration: "Carte grise de la moto que vous conduisez.",
  id_card: "CNI, passeport ou attestation d'identité.",
  insurance: "Attestation d'assurance en cours de validité (facultatif).",
};

/** Réduit la photo (1600 px max, JPEG) avant l'envoi : plus rapide et moins de données mobiles. */
function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Ce fichier n'est pas une image lisible."));
    };
    img.src = url;
  });
}

function DocumentRow({ type, doc, onSaved }: { type: DocumentType; doc?: DriverDocument; onSaved: (docs: DriverDocument[], revalidation: boolean) => void }) {
  const [expiresAt, setExpiresAt] = useState(doc?.expiresAt?.slice(0, 10) ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const needsDate = EXPIRING_DOCUMENTS.includes(type);
  const required = REQUIRED_DOCUMENTS.includes(type);

  async function upload(file: File) {
    setError("");
    if (needsDate && !expiresAt) {
      setError("Indiquez d'abord la date d'expiration.");
      return;
    }
    setBusy(true);
    try {
      const data = await compress(file);
      const res = await api<{ documents: DriverDocument[]; revalidation: boolean }>("/api/driver/documents", { type, data, expiresAt });
      onSaved(res.documents, res.revalidation);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const status = !doc
    ? { text: required ? "À envoyer" : "Facultatif", style: required ? "bg-amber-100 text-amber-800" : "bg-subtle text-muted" }
    : doc.expired
      ? { text: "Expiré", style: "bg-red-100 text-red-700" }
      : doc.expiringSoon
        ? { text: "Expire bientôt", style: "bg-amber-100 text-amber-800" }
        : { text: "Envoyé ✓", style: "bg-emerald-100 text-emerald-800" };

  return (
    <div className="space-y-2 rounded-2xl border border-line p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{DOCUMENT_LABELS[type]}</p>
          <p className="text-xs text-muted">{HINTS[type]}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.style}`}>{status.text}</span>
      </div>
      {doc && (
        <p className="text-xs text-muted">
          Envoyé le {formatDate(doc.uploadedAt)}
          {doc.expiresAt ? ` · expire le ${formatDate(doc.expiresAt)}` : ""} ·{" "}
          <a href={`/api/driver/documents/${doc.id}/file`} target="_blank" rel="noreferrer" className="font-semibold text-brand">
            Voir
          </a>
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {needsDate && (
          <label className="flex items-center gap-2 text-xs">
            Expire le
            <input
              type="date"
              value={expiresAt}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="h-9 rounded-xl border border-line bg-surface px-2"
            />
          </label>
        )}
        <label className={`inline-flex cursor-pointer items-center rounded-full px-3 py-2 text-xs font-semibold ${busy ? "bg-subtle text-muted" : "bg-contrast text-on-contrast"}`}>
          {busy ? "Envoi…" : doc ? "📷 Remplacer" : "📷 Prendre ou choisir une photo"}
          <input
            type="file"
            accept="image/*"
            capture={type === "photo" ? "user" : "environment"}
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload(file);
            }}
          />
        </label>
      </div>
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

export function DocumentsPanel() {
  const [docs, setDocs] = useState<DriverDocument[] | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<{ documents: DriverDocument[] }>("/api/driver/documents")
      .then((d) => setDocs(d.documents))
      .catch(() => setDocs([]));
  }, []);

  return (
    <section id="documents" className="scroll-mt-6 rounded-3xl bg-surface p-5 shadow-sm ring-1 ring-line">
      <h2 className="text-lg font-extrabold">📄 Mes documents</h2>
      <p className="mb-4 text-sm text-muted">
        Ils permettent à l&apos;équipe SURPLACE de vérifier votre identité et votre moto. Seule votre photo est montrée aux
        passagers.
      </p>
      {message && <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{message}</p>}
      {docs === null ? (
        <div className="h-40 animate-pulse rounded-2xl bg-subtle" />
      ) : (
        <div className="space-y-3">
          {ORDER.map((type) => (
            <DocumentRow
              key={type}
              type={type}
              doc={docs.find((d) => d.type === type)}
              onSaved={(list, revalidation) => {
                setDocs(list);
                setMessage(revalidation ? "Document remplacé : votre compte repasse en vérification par l'équipe SURPLACE." : "");
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
