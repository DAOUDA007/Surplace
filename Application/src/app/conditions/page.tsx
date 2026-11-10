import Link from "next/link";
import { LegalPage, List, Section } from "@/components/LegalPage";
import { CITY_NAME } from "@/lib/places";
import { CONTACT, EMERGENCY_NUMBERS, LEGAL } from "@/lib/site";

export const metadata = { title: "Conditions d'utilisation — SURPLACE" };

/**
 * Conditions générales d'utilisation. Toute modification du texte doit s'accompagner d'un changement de
 * TERMS_VERSION (Commun/lib/site.ts) : chaque utilisateur devra alors accepter la nouvelle version.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      intro={`Ces conditions fixent les règles d'utilisation de SURPLACE, le service de commande de taxis-motos à ${CITY_NAME}. Elles s'appliquent à toute personne qui utilise l'application, qu'elle soit passager ou chauffeur.`}
    >
      <Section n={1} title="Éditeur du service">
        <p>
          SURPLACE est édité par <strong>{LEGAL.publisher}</strong>, {LEGAL.registration}, dont le siège est situé{" "}
          {CONTACT.address}. Responsable du service : {LEGAL.director}.
        </p>
        <p>
          Contact : {CONTACT.phone} · {CONTACT.email}.
        </p>
      </Section>

      <Section n={2} title="Acceptation des conditions">
        <p>
          L&apos;utilisation de SURPLACE suppose l&apos;acceptation sans réserve des présentes conditions et de la{" "}
          <Link href="/confidentialite" className="font-semibold text-brand underline">
            politique de confidentialité
          </Link>
          . Cette acceptation est demandée à l&apos;inscription, à la première commande sans compte, et à nouveau à chaque
          modification de ces textes. La date et la version acceptées sont enregistrées.
        </p>
        <p>Si vous n&apos;acceptez pas ces conditions, vous ne pouvez pas utiliser l&apos;application.</p>
      </Section>

      <Section n={3} title="Le service">
        <p>
          SURPLACE est une plateforme de <strong>mise en relation</strong> entre des passagers et des chauffeurs de
          taxi-moto indépendants exerçant à {CITY_NAME} et dans ses environs. L&apos;application permet de connaître le
          prix d&apos;un trajet avant de commander, de trouver un chauffeur disponible, de suivre son arrivée et le trajet
          en temps réel, et de noter la course.
        </p>
        <p>
          Les chauffeurs ne sont pas salariés de SURPLACE : ils exercent leur activité de manière indépendante et sont
          seuls responsables de la conduite de leur véhicule et du transport des passagers.
        </p>
      </Section>

      <Section n={4} title="Compte et accès">
        <List
          items={[
            "Le compte est créé avec votre nom et votre numéro de téléphone, vérifié par un code envoyé par SMS. Vous choisissez un code PIN de 4 chiffres pour vous connecter.",
            "Un passager peut aussi commander sans créer de compte : son nom et son numéro sont alors demandés et vérifiés au moment de la commande.",
            "Vous vous engagez à donner des informations exactes et à les tenir à jour. Un compte est personnel : une seule personne par compte.",
            "Votre code PIN est confidentiel. Toute action réalisée avec votre compte est réputée faite par vous. En cas de perte ou d'utilisation frauduleuse, utilisez « Code PIN oublié » ou contactez SURPLACE.",
            "Le service est réservé aux personnes majeures. Un mineur ne peut l'utiliser qu'avec l'accord et sous la responsabilité de ses parents ou de son tuteur.",
          ]}
        />
      </Section>

      <Section n={5} title="Commande, prix et paiement">
        <List
          items={[
            "Le prix est calculé et affiché avant la commande, selon la distance du trajet et le tarif en vigueur. Une majoration peut s'appliquer la nuit ou en cas de pluie : elle est alors indiquée avant de commander.",
            "Le prix affiché est celui que vous payez : le chauffeur ne peut pas demander un montant supérieur.",
            "Le paiement se fait en espèces, directement au chauffeur, à la fin de la course.",
            "Une course peut être réservée à l'avance (jusqu'à 7 jours) ou commandée pour un proche, dont le nom et le numéro sont alors transmis au chauffeur.",
            "Le passager peut annuler tant que la course n'a pas commencé. Les annulations répétées ou abusives peuvent entraîner la suspension du compte.",
          ]}
        />
      </Section>

      <Section n={6} title="Engagements du passager">
        <List
          items={[
            "Être présent au point de départ indiqué et joignable au numéro donné.",
            "Respecter le chauffeur, son véhicule et les règles de sécurité routière, notamment le port du casque.",
            "Payer le prix affiché à la fin de la course.",
            "Ne pas utiliser le service pour transporter des objets ou des substances illicites ou dangereux.",
          ]}
        />
      </Section>

      <Section n={7} title="Engagements du chauffeur">
        <List
          items={[
            "Détenir un permis de conduire valide pour la catégorie de son véhicule, une carte grise, une assurance en cours de validité et une pièce d'identité, et les fournir à SURPLACE. Le compte n'est activé qu'après vérification par l'équipe.",
            "Utiliser un véhicule en bon état et conforme à la réglementation, respecter le code de la route et assurer la sécurité du passager.",
            "Appliquer le prix affiché dans l'application, sans supplément.",
            "Se comporter avec courtoisie, sans aucune discrimination ni violence.",
            "Ne passer en ligne que lorsqu'il est réellement disponible, et partager sa position pendant ce temps (voir la politique de confidentialité).",
          ]}
        />
      </Section>

      <Section n={8} title="Abonnement des chauffeurs">
        <p>
          SURPLACE ne prélève aucune commission sur les courses : le chauffeur garde l&apos;intégralité du prix. En
          contrepartie, l&apos;accès aux courses nécessite un abonnement (mensuel ou annuel) dont les prix sont affichés dans
          l&apos;application.
        </p>
        <p>
          L&apos;abonnement est payé à SURPLACE (lien de paiement en ligne, Mobile Money ou espèces) et activé dès que
          l&apos;équipe a confirmé la réception du paiement. Une période payée s&apos;ajoute à la fin de l&apos;abonnement en
          cours. Sauf erreur de SURPLACE, un abonnement activé n&apos;est pas remboursable.
        </p>
      </Section>

      <Section n={9} title="Notes et avis">
        <p>
          Après chaque course, passagers et chauffeurs peuvent se noter. Les commentaires des passagers peuvent être
          publiés sur la page d&apos;accueil, avec seulement le prénom et l&apos;initiale du nom. SURPLACE peut retirer tout
          avis injurieux, diffamatoire ou sans rapport avec la course.
        </p>
      </Section>

      <Section n={10} title="Sécurité et urgence">
        <p>
          Pendant une course, le bouton « Urgence » prévient l&apos;équipe SURPLACE et, si vous l&apos;avez indiquée, la
          personne à prévenir. Vous pouvez aussi partager le suivi de votre course avec un proche.
        </p>
        <p>
          Ces outils ne remplacent pas les services publics de secours. En cas de danger, appelez directement :{" "}
          {EMERGENCY_NUMBERS.map((n) => `${n.label} (${n.phone})`).join(", ")}.
        </p>
      </Section>

      <Section n={11} title="Responsabilité">
        <List
          items={[
            "SURPLACE met tout en œuvre pour que l'application fonctionne correctement, sans pouvoir garantir une disponibilité permanente ni la présence d'un chauffeur à tout moment.",
            "Les cartes, adresses, distances et durées affichées sont indicatives.",
            "SURPLACE n'est pas responsable des dommages causés par le comportement d'un passager ou d'un chauffeur, ni des objets oubliés pendant une course. SURPLACE aide toutefois à les retrouver via le formulaire de réclamation.",
          ]}
        />
      </Section>

      <Section n={12} title="Suspension et suppression du compte">
        <p>
          SURPLACE peut suspendre ou supprimer un compte en cas de non-respect de ces conditions, de fraude, de
          comportement dangereux, de documents invalides ou d&apos;abonnement non payé (pour les chauffeurs).
        </p>
        <p>
          Vous pouvez demander à tout moment la suppression de votre compte en contactant SURPLACE. Les courses passées
          sont alors conservées sous une forme anonyme, pour l&apos;historique des autres utilisateurs et les obligations
          comptables.
        </p>
      </Section>

      <Section n={13} title="Propriété intellectuelle">
        <p>
          Le nom SURPLACE, le logo, l&apos;application et leurs contenus sont protégés. Toute reproduction ou utilisation
          sans autorisation est interdite. Les fonds de carte proviennent d&apos;OpenStreetMap, sous licence ODbL.
        </p>
      </Section>

      <Section n={14} title="Données personnelles">
        <p>
          Le traitement de vos données est décrit dans la{" "}
          <Link href="/confidentialite" className="font-semibold text-brand underline">
            politique de confidentialité
          </Link>
          , qui fait partie de ces conditions.
        </p>
      </Section>

      <Section n={15} title="Modification des conditions">
        <p>
          SURPLACE peut modifier ces conditions, par exemple pour suivre l&apos;évolution du service ou de la loi. La
          nouvelle version vous sera présentée dans l&apos;application et devra être acceptée pour continuer à utiliser le
          service.
        </p>
      </Section>

      <Section n={16} title="Droit applicable et litiges">
        <p>
          Ces conditions sont soumises au droit ivoirien. En cas de litige, contactez d&apos;abord SURPLACE pour trouver
          une solution amiable. À défaut, le litige sera porté devant les juridictions compétentes de Côte d&apos;Ivoire.
        </p>
      </Section>
    </LegalPage>
  );
}
