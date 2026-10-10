import fs from "node:fs";
import path from "node:path";

/**
 * Envoi de SMS.
 * - SMS_PROVIDER=orange : API SMS d'Orange (https://developer.orange.com), avec ORANGE_CLIENT_ID,
 *   ORANGE_CLIENT_SECRET et ORANGE_SENDER (numéro d'expéditeur fourni par Orange, ex. +2250000).
 * - sinon (« console ») : rien n'est envoyé ; le SMS est affiché dans la console et enregistré dans data/sms/.
 */
const PROVIDER = (process.env.SMS_PROVIDER ?? "console").trim().toLowerCase();
const ORANGE_CLIENT_ID = process.env.ORANGE_CLIENT_ID?.trim();
const ORANGE_CLIENT_SECRET = process.env.ORANGE_CLIENT_SECRET?.trim();
const ORANGE_SENDER = process.env.ORANGE_SENDER?.trim();
const ORANGE_SENDER_NAME = process.env.ORANGE_SENDER_NAME?.trim();
const PREVIEW_DIR = path.join(process.cwd(), "data", "sms");

export const smsConfigured = PROVIDER === "orange" && !!ORANGE_CLIENT_ID && !!ORANGE_CLIENT_SECRET && !!ORANGE_SENDER;
export const smsProviderName = smsConfigured ? "Orange" : "console (aucun envoi réel)";

/** "0701020304" → "+2250701020304". */
export function internationalPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("225") ? `+${digits}` : `+225${digits}`;
}

let orangeToken: { value: string; expiresAt: number } | null = null;

async function orangeAccessToken() {
  if (orangeToken && orangeToken.expiresAt > Date.now() + 60_000) return orangeToken.value;
  const res = await fetch("https://api.orange.com/oauth/v3/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${ORANGE_CLIENT_ID}:${ORANGE_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Orange OAuth ${res.status}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  orangeToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return orangeToken.value;
}

async function sendOrange(to: string, text: string) {
  const sender = `tel:${ORANGE_SENDER}`;
  const res = await fetch(
    `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(sender)}/requests`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${await orangeAccessToken()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        outboundSMSMessageRequest: {
          address: `tel:${to}`,
          senderAddress: sender,
          ...(ORANGE_SENDER_NAME ? { senderName: ORANGE_SENDER_NAME } : {}),
          outboundSMSTextMessage: { message: text },
        },
      }),
    },
  );
  if (!res.ok) throw new Error(`Orange SMS ${res.status} : ${await res.text()}`);
}

function savePreview(to: string, text: string) {
  fs.mkdirSync(PREVIEW_DIR, { recursive: true });
  const file = path.join(PREVIEW_DIR, `${new Date().toISOString().replace(/[:.]/g, "-")}_${to.replace(/\D/g, "")}.txt`);
  fs.writeFileSync(file, `À : ${to}\n\n${text}\n`, "utf-8");
}

export async function sendSms(phone: string, text: string) {
  const to = internationalPhone(phone);
  if (!smsConfigured) {
    savePreview(to, text);
    console.log(`[sms] (non envoyé) ${to} : ${text}`);
    return;
  }
  await sendOrange(to, text);
  console.log(`[sms] envoyé à ${to}`);
}

/** Envoi sans attendre : un échec d'envoi ne bloque jamais l'utilisateur. */
export function sendSmsInBackground(phone: string, text: string) {
  sendSms(phone, text).catch((err) => console.error(`[sms] Échec vers ${phone} :`, (err as Error).message));
}
