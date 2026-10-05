import path from "node:path";

// Charge Backend/.env (identifiants Gmail, adresse du site…) s'il existe.
// Ce module doit être importé en premier, avant les modules qui lisent process.env.
try {
  process.loadEnvFile(path.join(process.cwd(), ".env"));
} catch {
  // Pas de fichier .env : valeurs par défaut.
}
