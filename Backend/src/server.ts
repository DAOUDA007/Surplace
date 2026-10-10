import { app } from "./app";
import { startJobs } from "./jobs";
import { mailEnabled } from "./mailer";
import { otpRequired } from "./otp";
import { osrmEnabled } from "./routing";
import { smsProviderName } from "./sms";

const PORT = Number(process.env.PORT ?? 4000);

app.listen(PORT, () => {
  console.log(`SURPLACE API prête sur http://localhost:${PORT}`);
  console.log(
    mailEnabled()
      ? "[e-mail] Envoi activé (SMTP configuré)."
      : "[e-mail] SMTP non configuré : les e-mails seront enregistrés dans data/emails/ (voir Backend/.env.example).",
  );
  console.log(`[sms] Fournisseur : ${smsProviderName}. Codes de vérification ${otpRequired ? "activés" : "désactivés"}.`);
  console.log(`[itinéraires] ${osrmEnabled ? "OSRM activé" : "estimation à vol d'oiseau (OSRM_URL non défini)"}.`);
  // Attribution des courses, rappels, sauvegardes, ménage.
  startJobs();
});
