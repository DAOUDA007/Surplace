import fs from "node:fs";
import path from "node:path";
import { db, DB_PATH } from "./db";

/** Sauvegardes de la base : une copie par jour dans data/backups/, conservées 30 jours. */
export const BACKUP_DIR = process.env.SURPLACE_BACKUP_DIR ?? path.join(path.dirname(DB_PATH), "backups");
const KEEP_DAYS = 30;

export function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith(".db"))
    .map((file) => {
      const stat = fs.statSync(path.join(BACKUP_DIR, file));
      return { file, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Copie cohérente de la base, même pendant son utilisation (API de sauvegarde de SQLite). */
export async function runBackup(label = "auto") {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const file = path.join(BACKUP_DIR, `surplace-${stamp}-${label}.db`);
  await db.backup(file);
  // Suppression des sauvegardes trop anciennes.
  const limit = Date.now() - KEEP_DAYS * 86_400_000;
  for (const b of listBackups()) {
    if (new Date(b.createdAt).getTime() < limit) fs.rmSync(path.join(BACKUP_DIR, b.file), { force: true });
  }
  console.log(`[sauvegarde] ${path.basename(file)}`);
  return path.basename(file);
}

/** Lance une sauvegarde si la dernière date de plus de 24 h ; vérifie toutes les heures. */
export function scheduleBackups() {
  const check = () => {
    const last = listBackups()[0];
    if (!last || Date.now() - new Date(last.createdAt).getTime() > 24 * 3600_000) {
      runBackup().catch((err) => console.error("[sauvegarde] Échec :", (err as Error).message));
    }
  };
  setTimeout(check, 30_000).unref();
  setInterval(check, 3600_000).unref();
}
