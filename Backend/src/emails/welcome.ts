import type { Mail } from "../mailer";
import { formatFcfa, PRICING, SUBSCRIPTION_PLANS } from "../pricing";
import { SITE_URL } from "../config";
import { CONTACT } from "../site";

const BRAND = "#ff6b00";
const INK = "#111827";
const MUTED = "#57534e";

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Bloc « étape » : pastille numérotée + titre + texte. */
function step(n: number, title: string, text: string) {
  return `
  <tr>
    <td valign="top" style="padding:0 14px 18px 0;width:36px;">
      <div style="width:32px;height:32px;line-height:32px;border-radius:16px;background:${BRAND};color:#ffffff;font-weight:800;font-size:15px;text-align:center;">${n}</div>
    </td>
    <td valign="top" style="padding:0 0 18px 0;">
      <p style="margin:0 0 2px 0;font-size:15px;font-weight:700;color:${INK};">${title}</p>
      <p style="margin:0;font-size:14px;line-height:21px;color:${MUTED};">${text}</p>
    </td>
  </tr>`;
}

function layout(opts: { preheader: string; firstName: string; intro: string; body: string; ctaLabel: string; ctaHref: string }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>Bienvenue sur SURPLACE</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:Arial,Helvetica,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:20px;overflow:hidden;">
        <!-- En-tête -->
        <tr>
          <td style="background:${INK};padding:28px 32px;">
            <p style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px;color:#ffffff;">🏍️ SUR<span style="color:${BRAND};">PLACE</span></p>
            <p style="margin:6px 0 0 0;font-size:13px;color:#d6d3d1;">Le taxi-moto de Korhogo</p>
          </td>
        </tr>
        <!-- Message -->
        <tr>
          <td style="padding:32px 32px 8px 32px;">
            <h1 style="margin:0 0 12px 0;font-size:24px;line-height:30px;color:${INK};">Bienvenue, ${escapeHtml(opts.firstName)} ! 👋</h1>
            <p style="margin:0 0 24px 0;font-size:15px;line-height:23px;color:${MUTED};">${opts.intro}</p>
            ${opts.body}
          </td>
        </tr>
        <!-- Bouton -->
        <tr>
          <td align="center" style="padding:8px 32px 32px 32px;">
            <a href="${opts.ctaHref}" style="display:inline-block;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:14px;">${opts.ctaLabel}</a>
          </td>
        </tr>
        <!-- Contact -->
        <tr>
          <td style="padding:20px 32px;background:#fff1e6;">
            <p style="margin:0 0 6px 0;font-size:14px;font-weight:700;color:${INK};">Besoin d'aide ?</p>
            <p style="margin:0;font-size:13px;line-height:20px;color:${MUTED};">
              📞 ${CONTACT.phone} · 💬 WhatsApp : <a href="https://wa.me/${CONTACT.whatsapp}" style="color:${BRAND};">${CONTACT.phone}</a><br>
              ✉️ <a href="mailto:${CONTACT.email}" style="color:${BRAND};">${CONTACT.email}</a> · 🕐 ${CONTACT.hours}
            </p>
          </td>
        </tr>
        <!-- Pied de page -->
        <tr>
          <td style="padding:20px 32px 28px 32px;">
            <p style="margin:0;font-size:12px;line-height:18px;color:#a8a29e;">
              Vous recevez cet e-mail car un compte SURPLACE vient d'être créé avec cette adresse.
              Si ce n'est pas vous, répondez simplement à ce message.<br>
              © ${new Date().getFullYear()} SURPLACE · ${CONTACT.address}
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function welcomeEmail(user: { name: string; email: string; role: "passenger" | "driver" }): Mail {
  const firstName = user.name.trim().split(/\s+/)[0];

  if (user.role === "driver") {
    const monthly = formatFcfa(SUBSCRIPTION_PLANS.monthly.price);
    const yearly = formatFcfa(SUBSCRIPTION_PLANS.yearly.price);
    const body = `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        ${step(1, "Validation de votre compte", "Notre équipe vérifie vos informations et votre moto. Vous serez prévenu dans l'application dès que votre compte est validé.")}
        ${step(2, "Choisissez votre abonnement", `Aucune commission sur vos courses : vous gardez 100 % de vos gains. Abonnement mensuel à ${monthly} ou annuel à ${yearly} (2 mois offerts).`)}
        ${step(3, "Passez en ligne", "Activez le mode « En ligne » pour recevoir les demandes de courses autour de vous, acceptez-les et suivez l'itinéraire.")}
        ${step(4, "Encaissez en espèces", "À la fin de chaque course, le passager vous paie le montant affiché dans l'application.")}
      </table>`;
    const html = layout({
      preheader: "Votre compte chauffeur SURPLACE est créé. Voici les prochaines étapes.",
      firstName,
      intro:
        "Merci d'avoir rejoint SURPLACE en tant que chauffeur. Votre compte est créé : voici les prochaines étapes pour commencer à recevoir des courses à Korhogo.",
      body,
      ctaLabel: "Accéder à mon espace chauffeur",
      ctaHref: `${SITE_URL}/chauffeur`,
    });
    const text = [
      `Bienvenue, ${firstName} !`,
      "",
      "Merci d'avoir rejoint SURPLACE en tant que chauffeur.",
      "1. Validation de votre compte : notre équipe vérifie vos informations et votre moto.",
      `2. Abonnement : aucune commission. Mensuel ${monthly} ou annuel ${yearly}.`,
      "3. Passez en ligne pour recevoir les demandes de courses.",
      "4. Encaissez en espèces à la fin de chaque course.",
      "",
      `Votre espace : ${SITE_URL}/chauffeur`,
      `Besoin d'aide ? ${CONTACT.phone} · ${CONTACT.email}`,
    ].join("\n");
    return { to: user.email, subject: `Bienvenue chez SURPLACE, ${firstName} ! Votre compte chauffeur est créé`, html, text };
  }

  const body = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${step(1, "Indiquez votre trajet", "Choisissez votre point de départ (ou utilisez « Ma position ») et votre destination sur la carte.")}
      ${step(2, "Voyez le prix avant de commander", `Tarif simple : ${PRICING.perKm} F par kilomètre, course minimum ${formatFcfa(PRICING.minimumFare)}. Pas de marchandage.`)}
      ${step(3, "Suivez votre moto en direct", "Un chauffeur accepte votre course : vous voyez son nom, sa moto, sa plaque et sa position jusqu'à votre arrivée.")}
      ${step(4, "Payez en espèces", "Réglez le montant affiché directement au chauffeur, puis donnez-lui une note.")}
    </table>`;
  const html = layout({
    preheader: "Votre compte SURPLACE est prêt. Commandez votre premier taxi-moto à Korhogo.",
    firstName,
    intro:
      "Merci de votre inscription ! Votre compte est prêt : vous pouvez dès maintenant commander un taxi-moto partout à Korhogo, en quelques secondes.",
    body,
    ctaLabel: "Commander ma première course",
    ctaHref: `${SITE_URL}/passager`,
  });
  const text = [
    `Bienvenue, ${firstName} !`,
    "",
    "Merci de votre inscription sur SURPLACE. Votre compte est prêt.",
    "1. Indiquez votre trajet sur la carte.",
    `2. Voyez le prix avant de commander : ${PRICING.perKm} F/km, minimum ${formatFcfa(PRICING.minimumFare)}.`,
    "3. Suivez votre moto en direct.",
    "4. Payez en espèces au chauffeur.",
    "",
    `Commander : ${SITE_URL}/passager`,
    `Besoin d'aide ? ${CONTACT.phone} · ${CONTACT.email}`,
  ].join("\n");
  return { to: user.email, subject: `Bienvenue sur SURPLACE, ${firstName} ! 🏍️`, html, text };
}
