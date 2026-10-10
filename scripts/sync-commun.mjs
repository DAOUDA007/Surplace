#!/usr/bin/env node
/**
 * Recopie les fichiers partagés du dossier Commun/ vers le Backend et les deux sites.
 *
 * Commun/ est la SEULE version à modifier. Les copies portent un en-tête « fichier copié »
 * et sont réécrites à chaque `npm run dev` / `npm run build` (scripts predev / prebuild).
 *
 *   node scripts/sync-commun.mjs          recopie
 *   node scripts/sync-commun.mjs --check  vérifie seulement (code de sortie 1 si une copie diffère)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Fichier de Commun/ → dossiers de destination. */
const TARGETS = {
  "lib/types.ts": ["Backend/src", "Application/src/lib", "Administration/src/lib"],
  "lib/pricing.ts": ["Backend/src", "Application/src/lib", "Administration/src/lib"],
  "lib/site.ts": ["Backend/src", "Application/src/lib", "Administration/src/lib"],
  "lib/permissions.ts": ["Backend/src", "Administration/src/lib"],
  "lib/format.ts": ["Application/src/lib", "Administration/src/lib"],
  "lib/theme.ts": ["Application/src/lib", "Administration/src/lib"],
  "lib/api.ts": ["Application/src/lib", "Administration/src/lib"],
  "lib/places.ts": ["Application/src/lib", "Administration/src/lib"],
  "lib/preferences.ts": ["Application/src/lib", "Administration/src/lib"],
  "lib/push.ts": ["Application/src/lib", "Administration/src/lib"],
  "components/Logo.tsx": ["Application/src/components", "Administration/src/components"],
  "components/ThemeToggle.tsx": ["Application/src/components", "Administration/src/components"],
  "components/MapView.tsx": ["Application/src/components", "Administration/src/components"],
  "components/LeafletMap.tsx": ["Application/src/components", "Administration/src/components"],
  "components/ui.tsx": ["Application/src/components", "Administration/src/components"],
  "components/ProfileForm.tsx": ["Application/src/components", "Administration/src/components"],
  "components/PwaSetup.tsx": ["Application/src/components", "Administration/src/components"],
  "components/PinResetForm.tsx": ["Application/src/components", "Administration/src/components"],
  "components/OtpField.tsx": ["Application/src/components", "Administration/src/components"],
  "hooks/useServerEvents.ts": ["Application/src/hooks", "Administration/src/hooks"],
  "hooks/usePublicConfig.ts": ["Application/src/hooks", "Administration/src/hooks"],
  "styles/globals.css": ["Application/src/app", "Administration/src/app"],
  "public/sw.js": ["Application/public", "Administration/public"],
  "public/icon-192.png": ["Application/public", "Administration/public"],
  "public/icon-512.png": ["Application/public", "Administration/public"],
  "public/icon-maskable-512.png": ["Application/public", "Administration/public"],
};

function header(source, ext) {
  const text = `⚠️ Fichier copié depuis Commun/${source} par scripts/sync-commun.mjs : modifiez l'original dans Commun/.`;
  if (ext === ".css" || ext === ".js") return `/* ${text} */\n`;
  return `// ${text}\n`;
}

/** "use client" doit rester la toute première ligne d'un composant. */
function withHeader(content, source) {
  const head = header(source, path.extname(source));
  const directive = content.match(/^("use client";|'use client';)\r?\n/);
  if (directive) return directive[0] + head + content.slice(directive[0].length);
  return head + content;
}

const check = process.argv.includes("--check");
let differences = 0;
let written = 0;

for (const [source, dirs] of Object.entries(TARGETS)) {
  const from = path.join(ROOT, "Commun", source);
  if (!fs.existsSync(from)) continue;
  // Images et sons : copie à l'identique (pas d'en-tête possible).
  const binary = /\.(png|jpe?g|webp|ico|mp3)$/i.test(source);
  const expected = binary ? fs.readFileSync(from) : withHeader(fs.readFileSync(from, "utf8"), source);
  for (const dir of dirs) {
    const to = path.join(ROOT, dir, path.basename(source));
    const current = fs.existsSync(to) ? fs.readFileSync(to, binary ? undefined : "utf8") : null;
    const same = current !== null && (binary ? Buffer.compare(current, expected) === 0 : current === expected);
    if (same) continue;
    differences++;
    if (check) {
      console.error(`Copie différente de Commun/${source} : ${path.relative(ROOT, to)}`);
    } else {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.writeFileSync(to, expected);
      written++;
    }
  }
}

if (check) {
  if (differences) {
    console.error(`${differences} copie(s) à mettre à jour : lancez « node scripts/sync-commun.mjs ».`);
    process.exit(1);
  }
  console.log("Fichiers communs à jour.");
} else {
  console.log(written ? `Commun/ : ${written} fichier(s) recopié(s).` : "Commun/ : rien à recopier.");
}
