import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { db, DB_PATH } from "./db";
import { publish, publishToUser } from "./events";
import { HttpError } from "./http";
import { getSettings } from "./settings";
import {
  DOCUMENT_LABELS,
  EXPIRING_DOCUMENTS,
  REQUIRED_DOCUMENTS,
  type DocumentType,
  type DriverDocument,
} from "./types";

/**
 * Documents des chauffeurs (photo, permis, carte grise, pièce d'identité, assurance).
 * Les images sont enregistrées dans data/uploads/documents/ et ne sont servies qu'aux personnes autorisées
 * (le chauffeur lui-même et l'équipe ; la photo du visage aussi au passager de la course).
 */
const UPLOAD_DIR = path.join(path.dirname(DB_PATH), "uploads", "documents");
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Changer ces documents remet un chauffeur validé « à valider ». */
const REVALIDATION_TYPES: DocumentType[] = ["photo", "license", "registration", "id_card"];

export function isDocumentType(value: unknown): value is DocumentType {
  return typeof value === "string" && value in DOCUMENT_LABELS;
}

function checkMagic(buffer: Buffer, mime: string) {
  if (mime === "image/jpeg") return buffer[0] === 0xff && buffer[1] === 0xd8;
  if (mime === "image/png") return buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (mime === "image/webp") return buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP";
  return false;
}

function parseDate(value: unknown) {
  const text = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(text).getTime())) {
    throw new HttpError(400, "Date d'expiration invalide.");
  }
  // Fin de journée : le document est valable tout le jour indiqué.
  return `${text}T23:59:59.000Z`;
}

const DAY = 86_400_000;

function toDocument(row: { id: number; type: DocumentType; uploaded_at: string; expires_at: string | null }): DriverDocument {
  const expiresMs = row.expires_at ? new Date(row.expires_at).getTime() : null;
  return {
    id: row.id,
    type: row.type,
    uploadedAt: row.uploaded_at,
    expiresAt: row.expires_at,
    expired: expiresMs != null && expiresMs < Date.now(),
    expiringSoon: expiresMs != null && expiresMs >= Date.now() && expiresMs < Date.now() + 30 * DAY,
  };
}

export function listDocuments(driverId: number): DriverDocument[] {
  return (
    db
      .prepare("SELECT id, type, uploaded_at, expires_at FROM driver_documents WHERE driver_id = ? ORDER BY id")
      .all(driverId) as { id: number; type: DocumentType; uploaded_at: string; expires_at: string | null }[]
  ).map(toDocument);
}

/** Problèmes de documents d'un chauffeur : manquants ou expirés. */
export function documentIssues(driverId: number): string[] {
  const docs = listDocuments(driverId);
  const issues: string[] = [];
  for (const type of REQUIRED_DOCUMENTS) {
    if (!docs.some((d) => d.type === type)) issues.push(`${DOCUMENT_LABELS[type]} manquant(e)`);
  }
  for (const d of docs) if (d.expired) issues.push(`${DOCUMENT_LABELS[d.type]} expiré(e)`);
  return issues;
}

/** Les problèmes de documents bloquent-ils ce chauffeur ? (réglage « documents obligatoires »). */
export function documentsBlocking(driverId: number) {
  return getSettings().documentsRequired ? documentIssues(driverId) : [];
}

/** Enregistre (ou remplace) un document envoyé sous forme d'image « data URL » (data:image/jpeg;base64,…). */
export function saveDocument(driverId: number, typeInput: unknown, dataUrl: unknown, expiresInput: unknown) {
  if (!isDocumentType(typeInput)) throw new HttpError(400, "Type de document inconnu.");
  const type = typeInput;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl ?? ""));
  if (!match) throw new HttpError(400, "Envoyez une photo (JPEG, PNG ou WebP).");
  const mime = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_BYTES) throw new HttpError(400, "Image trop lourde (5 Mo maximum).");
  if (!checkMagic(buffer, mime)) throw new HttpError(400, "Le fichier n'est pas une image valide.");

  let expiresAt: string | null = null;
  if (EXPIRING_DOCUMENTS.includes(type)) {
    expiresAt = parseDate(expiresInput);
    if (new Date(expiresAt).getTime() < Date.now()) throw new HttpError(400, "Ce document est déjà expiré.");
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const file = `${driverId}-${type}-${randomBytes(6).toString("hex")}.${MIME_EXT[mime]}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, file), buffer);

  const previous = db.prepare("SELECT file FROM driver_documents WHERE driver_id = ? AND type = ?").get(driverId, type) as
    | { file: string }
    | undefined;
  let revalidation = false;
  db.transaction(() => {
    db.prepare("DELETE FROM driver_documents WHERE driver_id = ? AND type = ?").run(driverId, type);
    db.prepare(
      "INSERT INTO driver_documents (driver_id, type, file, mime, expires_at, uploaded_at) VALUES (?, ?, ?, ?, ?, ?)",
    ).run(driverId, type, file, mime, expiresAt, new Date().toISOString());
    // Remplacer un document déjà vérifié : l'équipe doit revérifier.
    if (previous && REVALIDATION_TYPES.includes(type)) {
      const res = db
        .prepare("UPDATE drivers SET status = 'pending', is_online = 0 WHERE user_id = ? AND status = 'approved'")
        .run(driverId);
      revalidation = res.changes > 0;
    }
  })();
  if (previous) fs.rmSync(path.join(UPLOAD_DIR, previous.file), { force: true });
  if (revalidation) {
    publishToUser(driverId, { type: "profile" });
    publish("drivers", { type: "available-rides" });
  }
  return { documents: listDocuments(driverId), revalidation };
}

export function documentFile(documentId: number) {
  const row = db.prepare("SELECT driver_id, file, mime FROM driver_documents WHERE id = ?").get(documentId) as
    | { driver_id: number; file: string; mime: string }
    | undefined;
  if (!row) throw new HttpError(404, "Document introuvable.");
  return { driverId: row.driver_id, path: path.join(UPLOAD_DIR, row.file), mime: row.mime };
}

export function driverPhoto(driverId: number) {
  const row = db.prepare("SELECT file, mime FROM driver_documents WHERE driver_id = ? AND type = 'photo'").get(driverId) as
    | { file: string; mime: string }
    | undefined;
  if (!row) throw new HttpError(404, "Pas de photo.");
  return { path: path.join(UPLOAD_DIR, row.file), mime: row.mime };
}

/** Supprime les fichiers d'un chauffeur (suppression ou anonymisation du compte). */
export function deleteDriverFiles(driverId: number) {
  const rows = db.prepare("SELECT file FROM driver_documents WHERE driver_id = ?").all(driverId) as { file: string }[];
  db.prepare("DELETE FROM driver_documents WHERE driver_id = ?").run(driverId);
  for (const r of rows) fs.rmSync(path.join(UPLOAD_DIR, r.file), { force: true });
}

/** Nombre de documents expirés ou expirant dans 30 jours (pastille de l'administration). */
export function countExpiringDocuments() {
  return (
    db
      .prepare(
        `SELECT COUNT(*) AS n FROM driver_documents dd JOIN users u ON u.id = dd.driver_id
          WHERE u.deleted_at IS NULL AND dd.expires_at IS NOT NULL AND dd.expires_at < ?`,
      )
      .get(new Date(Date.now() + 30 * DAY).toISOString()) as { n: number }
  ).n;
}
