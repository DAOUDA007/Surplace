import Link from "next/link";
import { LegalPage, List, Section } from "@/components/LegalPage";
import { CONTACT, LEGAL } from "@/lib/site";

export const metadata = { title: "Politique de confidentialité — SURPLACE" };

/**
 * Politique de confidentialité. Elle décrit ce que l'application enregistre réellement : si le code change
 * (nouvelle donnée, nouveau prestataire), mettez ce texte à jour et changez TERMS_VERSION (Commun/lib/site.ts).
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro="Cette politique explique quelles données SURPLACE collecte, pourquoi, avec qui elles sont partagées, combien de temps elles sont conservées et comment exercer vos droits."
    >
      <Section n={1} title="Responsable du traitement">
        <p>
          Les données sont traitées par <strong>{LEGAL.publisher}</strong> ({LEGAL.registration}), {CONTACT.address},
          représenté par {LEGAL.director}. Contact pour toute question sur vos données : {CONTACT.email} ·{" "}
          {CONTACT.phone}.
        </p>
        <p>
          Les traitements sont réalisés conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la
          protection des données à caractère personnel. Déclaration auprès de l&apos;Autorité de Régulation des
          Télécommunications/TIC de Côte d&apos;Ivoire (ARTCI) : {LEGAL.artci}.
        </p>
      </Section>

      <Section n={2} title="Données collectées">
        <p>
          <strong>Pour tous les utilisateurs</strong>
        </p>
        <List
          items={[
            "Identité et contact : nom, numéro de téléphone, adresse e-mail (facultative).",
            "Code PIN : il est enregistré sous une forme chiffrée irréversible. Personne, pas même l'équipe SURPLACE, ne peut le lire.",
            "Courses : adresses et coordonnées de départ et d'arrivée, date et heure, distance, prix, statut, notes et commentaires. Pour une course commandée pour un proche : son nom et son numéro.",
            "Lieux enregistrés (Maison, Travail, favoris) et dernières destinations.",
            "Sécurité : personne à prévenir en cas d'urgence (facultative), alertes d'urgence déclenchées avec la position et l'heure, liens de suivi partagés.",
            "Échanges : réclamations, messages envoyés depuis le formulaire de contact, notifications reçues.",
          ]}
        />
        <p>
          <strong>Pour les chauffeurs, en plus</strong>
        </p>
        <List
          items={[
            "Véhicule et permis : immatriculation, marque et modèle de la moto, numéro du permis de conduire.",
            "Documents : photos du permis, de la carte grise, de la pièce d'identité, de l'assurance et photo de profil, avec leurs dates d'expiration.",
            "Activité : périodes en ligne, courses proposées, acceptées ou refusées, gains, abonnements et paiements, parrainages.",
          ]}
        />
      </Section>

      <Section n={3} title="Localisation">
        <List
          items={[
            "Passager : votre position n'est lue que lorsque vous touchez « Ma position », pour remplir le point de départ. Elle n'est pas suivie en continu.",
            "Chauffeur : votre position est envoyée régulièrement tant que vous êtes en ligne, pour vous proposer les courses proches et permettre au passager de suivre votre arrivée. Elle n'est plus envoyée dès que vous passez hors ligne.",
            "Vous pouvez refuser l'accès à la localisation dans les réglages du navigateur. Un chauffeur ne peut alors pas recevoir de courses.",
          ]}
        />
      </Section>

      <Section n={4} title="Pourquoi ces données sont utilisées">
        <List
          items={[
            "Fournir le service : calculer le prix, trouver un chauffeur, suivre la course, permettre au passager et au chauffeur de se joindre.",
            "Vérifier les chauffeurs et la validité de leurs documents, gérer leurs abonnements.",
            "Assurer la sécurité : traitement des alertes d'urgence, prévention de la fraude et des abus.",
            "Vous informer : codes de vérification, étapes de la course, rappels d'abonnement, réponses aux réclamations (par notification, SMS ou e-mail).",
            "Améliorer le service : statistiques globales sur les courses et la demande.",
          ]}
        />
        <p>
          Ces traitements reposent sur l&apos;exécution du service que vous demandez, sur votre consentement (localisation,
          notifications, personne à prévenir) et sur l&apos;intérêt légitime de SURPLACE à sécuriser la plateforme. Vos
          données ne sont jamais vendues ni utilisées pour de la publicité.
        </p>
      </Section>

      <Section n={5} title="Qui peut voir vos données">
        <List
          items={[
            "Pendant une course, le chauffeur voit le nom, le numéro et le point de départ du passager (ou du proche transporté), ainsi que sa note. Le passager voit le nom, la photo, la moto, la plaque, la note et la position du chauffeur.",
            "La personne à qui vous partagez le suivi d'une course voit le trajet et la position de la moto jusqu'à la fin de la course.",
            "Les avis publiés sur la page d'accueil n'affichent que le prénom et l'initiale du nom.",
            "L'équipe SURPLACE, selon les droits de chacun (opérations, finances, modération), pour gérer le service. Ses actions sont enregistrées dans un journal.",
            "Les autorités, uniquement sur demande légale.",
          ]}
        />
      </Section>

      <Section n={6} title="Prestataires techniques">
        <p>SURPLACE fait appel aux services suivants, qui ne reçoivent que les données nécessaires à leur rôle :</p>
        <List
          items={[
            "Hébergement de l'application et de la base de données : Render et Vercel.",
            "Envoi des SMS (codes de vérification, alertes) : Orange.",
            "Envoi des e-mails : Google (Gmail).",
            "Notifications sur le téléphone : le service de notification de votre navigateur (Google, Apple ou Mozilla).",
            "Cartes, recherche d'adresses et itinéraires : OpenStreetMap, Photon (komoot) et le serveur d'itinéraires de la FOSSGIS. Les adresses recherchées et les points du trajet leur sont transmis, sans votre nom ni votre numéro.",
            "Navigation du chauffeur : le bouton « Itinéraire » ouvre Google Maps avec la destination.",
            "Paiement des abonnements en ligne : le prestataire de paiement vers lequel mène le bouton « Payer ». SURPLACE ne voit ni ne conserve vos données de paiement.",
          ]}
        />
        <p>
          Certains de ces prestataires sont situés hors de Côte d&apos;Ivoire (Europe, États-Unis). Ces transferts sont
          limités au fonctionnement du service.
        </p>
      </Section>

      <Section n={7} title="Durée de conservation">
        <List
          items={[
            "Compte et courses : tant que le compte existe. À sa suppression, le compte est effacé ; s'il a des courses, elles sont conservées sous une forme anonyme (nom et numéro effacés).",
            "Documents des chauffeurs : supprimés avec le compte.",
            "Codes de vérification SMS : valables 10 minutes, puis effacés.",
            "Session de connexion : 30 jours après la connexion, puis il faut se reconnecter.",
            "Copies de sauvegarde de la base : 30 jours.",
          ]}
        />
      </Section>

      <Section n={8} title="Sécurité">
        <p>
          Les échanges avec l&apos;application sont chiffrés (https). Les codes PIN sont chiffrés de manière irréversible,
          les tentatives de connexion sont limitées, l&apos;accès de l&apos;équipe est restreint selon les rôles et
          journalisé, et la base est sauvegardée chaque jour.
        </p>
      </Section>

      <Section n={9} title="Vos droits">
        <p>Conformément à la loi n° 2013-450, vous disposez des droits suivants sur vos données :</p>
        <List
          items={[
            "Accès : savoir quelles données SURPLACE détient sur vous et en obtenir une copie.",
            "Rectification : corriger vos données. Vous pouvez modifier vous-même votre nom, votre e-mail, votre numéro et la personne à prévenir dans « Mon profil ».",
            "Suppression : demander l'effacement de votre compte.",
            "Opposition : refuser certains traitements, par exemple les notifications ou l'accès à la localisation.",
          ]}
        />
        <p>
          Pour exercer ces droits, écrivez à {CONTACT.email} ou appelez le {CONTACT.phone}. Une réponse vous sera
          apportée dans un délai d&apos;un mois. Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir
          l&apos;ARTCI.
        </p>
      </Section>

      <Section n={10} title="Cookies et stockage sur l'appareil">
        <p>
          SURPLACE utilise un seul cookie, indispensable : il garde votre session ouverte. Vos préférences (thème, mode
          simple, annonces vocales, économie de batterie) sont enregistrées sur votre appareil uniquement. Aucun cookie de
          publicité ni de mesure d&apos;audience n&apos;est utilisé.
        </p>
      </Section>

      <Section n={11} title="Modification de cette politique">
        <p>
          Cette politique peut évoluer avec le service. Toute nouvelle version vous sera présentée dans l&apos;application
          et devra être acceptée, comme les{" "}
          <Link href="/conditions" className="font-semibold text-brand underline">
            conditions d&apos;utilisation
          </Link>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
