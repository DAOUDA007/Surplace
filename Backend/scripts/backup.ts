/**
 * Sauvegarde manuelle de la base (en plus de la sauvegarde automatique quotidienne).
 * Usage, depuis le dossier Backend : npm run backup
 */
import "../src/env";
import { BACKUP_DIR, runBackup } from "../src/backup";

runBackup("manuelle")
  .then((file) => console.log(`Sauvegarde créée : ${BACKUP_DIR}/${file}`))
  .catch((err) => {
    console.error("Échec de la sauvegarde :", (err as Error).message);
    process.exit(1);
  });
