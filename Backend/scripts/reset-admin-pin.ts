/**
 * Réinitialise le code PIN de l'administrateur principal (PIN oublié).
 *
 * Usage, depuis le dossier Backend :
 *   npm run reset-admin-pin -- 4821
 *
 * Les codes PIN sont stockés hachés (scrypt) : il est impossible de retrouver l'ancien,
 * on ne peut qu'en définir un nouveau. Les sessions de l'administrateur sont fermées.
 */
import "../src/env";
import { db } from "../src/db";
import { hashPin } from "../src/password";
import { validatePin } from "../src/validation";

const newPin = process.argv[2];
try {
  validatePin(newPin);
} catch {
  console.error("Indiquez un nouveau code PIN de 4 chiffres : npm run reset-admin-pin -- 4821");
  process.exit(1);
}

const admin = db
  .prepare(
    "SELECT id, name, phone FROM users WHERE role = 'admin' AND is_principal = 1 AND deleted_at IS NULL",
  )
  .get() as { id: number; name: string; phone: string } | undefined;

if (!admin) {
  console.error("Aucun administrateur principal trouvé dans la base.");
  process.exit(1);
}

db.transaction(() => {
  db.prepare("UPDATE users SET pin_hash = ?, blocked = 0 WHERE id = ?").run(hashPin(newPin), admin.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(admin.id);
})();

const phone = admin.phone.replace(/(\d{2})(?=\d)/g, "$1 ");
console.log(`Code PIN réinitialisé pour l'administrateur principal « ${admin.name} ».`);
console.log(`Connectez-vous sur /connexion avec le numéro ${phone} et votre nouveau code PIN.`);
