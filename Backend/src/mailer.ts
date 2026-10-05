import fs from "node:fs";
import path from "node:path";
import nodemailer, { type Transporter } from "nodemailer";

export interface Mail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Envoi via Gmail (SMTP) quand SMTP_USER et SMTP_PASS sont définis dans Backend/.env.
 * Sinon, les e-mails sont enregistrés dans data/emails/ pour pouvoir les prévisualiser.
 */
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.replace(/\s/g, "");
const FROM_NAME = process.env.MAIL_FROM_NAME?.trim() || "SURPLACE";
const PREVIEW_DIR = path.join(process.cwd(), "data", "emails");

let transporter: Transporter | null = null;
if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

export const mailEnabled = () => transporter !== null;

function savePreview(mail: Mail) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const safeTo = mail.to.replace(/[^a-z0-9@._-]/gi, "_");
  const file = path.join(PREVIEW_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}_${safeTo}.html`);
  fs.writeFileSync(file, mail.html, "utf-8");
  return file;
}

export async function sendMail(mail: Mail) {
  if (!transporter) {
    const file = savePreview(mail);
    console.log(`[e-mail] SMTP non configuré : « ${mail.subject} » pour ${mail.to} enregistré dans ${file}`);
    return;
  }
  await transporter.sendMail({
    from: `"${FROM_NAME}" <${SMTP_USER}>`,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
  console.log(`[e-mail] « ${mail.subject} » envoyé à ${mail.to}`);
}

/** Envoi en arrière-plan : une erreur d'envoi ne doit jamais bloquer l'utilisateur. */
export function sendMailInBackground(mail: Mail) {
  sendMail(mail).catch((err) => {
    console.error(`[e-mail] Échec de l'envoi à ${mail.to} :`, (err as Error).message);
  });
}
