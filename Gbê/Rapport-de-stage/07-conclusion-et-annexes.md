# CONCLUSION GÉNÉRALE

Au terme de ce stage effectué au sein de [À COMPLÉTER : structure d'accueil], nous avions pour mission de concevoir et de réaliser une application de commande et de gestion de taxis-motos adaptée à la ville de Korhogo.

L'étude de l'existant a montré que ce mode de transport, indispensable à la population, souffre d'un fonctionnement entièrement informel : attente imprévisible, prix négocié à chaque course, absence de traçabilité et de sécurité, conducteurs qui circulent à vide, et aucun outil pour organiser l'activité.

Pour y répondre, nous avons conduit une analyse rigoureuse selon la méthode **MERISE**. L'étude des données nous a menés des **règles de gestion** au **dictionnaire des données**, au **graphe des dépendances fonctionnelles**, puis au **modèle conceptuel**, au **modèle logique relationnel** et au **modèle physique** de la base. L'étude des traitements a décrit les échanges avec les acteurs (**diagramme des flux**), les opérations du système (**MCT**), leur organisation entre les postes de travail (**MOT**) et les accès aux données (**SAT**), validant ainsi le modèle de données.

Cette conception a abouti à **SURPLACE**, une solution composée d'une API sécurisée, d'une application web installable pour les passagers et les chauffeurs, et d'un espace d'administration. Elle permet de commander une moto au **prix connu à l'avance**, avec ou sans compte, de suivre le chauffeur **en temps réel**, de **partager** la course avec un proche et de donner l'**alerte** en cas de danger. Les chauffeurs reçoivent les demandes proches d'eux grâce à une **attribution automatique**, conservent la totalité du prix des courses et paient un simple abonnement. L'équipe dispose d'outils complets de contrôle : validation des chauffeurs et de leurs documents, tarifs réglables, rapports, exports et journal des actions. L'application a été **testée** (17 tests automatiques réussis) et **mise en ligne**.

Les objectifs fixés au début du stage sont donc atteints. Ce travail nous a permis de mettre en pratique les connaissances acquises au cours de notre formation, de découvrir les exigences d'un projet réel (sécurité, performances, mise en production) et de développer notre rigueur et notre autonomie.

## Perspectives

SURPLACE peut encore évoluer :

- **paiement par Mobile Money** (Orange Money, MTN MoMo, Moov Money, Wave) pour les courses et les abonnements, avec activation immédiate ;
- **activation du fournisseur SMS** pour vérifier systématiquement les numéros en production ;
- **enregistrement des annonces vocales** en dioula et en sénoufo, pour les personnes qui lisent difficilement le français ;
- **itinéraires routiers** systématiques avec un serveur OSRM dédié ;
- **extension** à d'autres villes du nord (Ferkessédougou, Boundiali, Odienné…) et à d'autres services (livraison de colis, courses pour les commerçants) ;
- **montée en charge** : passage à une base PostgreSQL et à plusieurs serveurs si l'activité le justifie ;
- **partenariats** avec les associations et syndicats de conducteurs pour accompagner l'adoption.

<div style="page-break-after: always"></div>

# BIBLIOGRAPHIE

- NANCI D., ESPINASSE B., *Ingénierie des systèmes d'information : Merise deuxième génération*, Vuibert.
- MATHERON J.-P., *Comprendre Merise : outils conceptuels et organisationnels*, Eyrolles.
- TARDIEU H., ROCHFELD A., COLLETTI R., *La méthode Merise : principes et outils*, Éditions d'Organisation.
- [À COMPLÉTER : supports de cours de votre établissement (Merise, bases de données, programmation web).]

# WEBOGRAPHIE

*(dates de consultation à compléter)*

- Documentation de Next.js — https://nextjs.org/docs
- Documentation de React — https://react.dev
- Documentation de Node.js — https://nodejs.org/docs
- Documentation d'Express — https://expressjs.com
- Documentation de SQLite — https://www.sqlite.org/docs.html
- Documentation de Leaflet — https://leafletjs.com
- OpenStreetMap et Nominatim — https://www.openstreetmap.org, https://nominatim.org
- Projet OSRM — https://project-osrm.org
- MDN Web Docs (Server-Sent Events, Push API, Geolocation API) — https://developer.mozilla.org
- Orange Developer, API SMS — https://developer.orange.com
- Documentation de Render — https://render.com/docs
- Documentation de Vercel — https://vercel.com/docs
- Looping (logiciel de modélisation MERISE) — https://www.looping-mcd.fr

<div style="page-break-after: always"></div>

# GLOSSAIRE

| Terme | Définition |
|---|---|
| API | Ensemble d'adresses par lesquelles les sites demandent ou modifient des données sur le serveur |
| Application web progressive (PWA) | Site web installable sur l'écran d'accueil du téléphone, qui se comporte comme une application |
| Attribution | Choix automatique du chauffeur à qui proposer une course |
| Cardinalité | Nombre minimum et maximum de fois qu'une entité participe à une association (MERISE) |
| Clé étrangère | Attribut d'une relation qui fait référence à la clé primaire d'une autre relation |
| Clé primaire | Attribut (ou groupe d'attributs) qui identifie de façon unique chaque ligne d'une relation |
| Dépendance fonctionnelle | Lien entre deux données : la connaissance de l'une détermine une seule valeur de l'autre |
| Entité | Objet de gestion décrit par des propriétés, dont l'une est l'identifiant (MERISE) |
| Géolocalisation | Détermination de la position du téléphone (GPS) |
| Hachage | Transformation à sens unique d'un secret (code PIN) ; on ne peut pas retrouver le secret à partir de son empreinte |
| Majoration | Hausse du prix en pourcentage (nuit, pluie) |
| Notification push | Message affiché par le téléphone même quand l'application est fermée |
| Session | Connexion d'un utilisateur, conservée par un cookie |
| Temps réel | Transmission immédiate des informations (position de la moto, étapes) sans recharger la page |
| Transaction | Ensemble d'opérations sur la base exécutées « tout ou rien » |

<div style="page-break-after: always"></div>

# ANNEXES

## Annexe 1 : Questionnaire d'enquête

[À COMPLÉTER : insérer le questionnaire utilisé. Modèle de questions :]

**Pour les usagers**
1. Combien de fois par semaine prenez-vous un taxi-moto ?
2. Combien de temps attendez-vous en moyenne une moto ?
3. Négociez-vous le prix à chaque course ? Le prix vous paraît-il juste ?
4. Vous êtes-vous déjà senti(e) en insécurité pendant une course ?
5. Avez-vous déjà oublié un objet ou eu un litige avec un conducteur ?
6. Avez-vous un smartphone avec internet ?
7. Utiliseriez-vous une application pour commander une moto au prix fixé à l'avance ?

**Pour les conducteurs**
1. Combien d'heures par jour travaillez-vous ?
2. Combien de temps passez-vous à chercher des clients ?
3. Avez-vous un smartphone avec internet ?
4. Seriez-vous prêt à payer un abonnement mensuel (sans commission) pour recevoir des courses ? À quel prix ?
5. Possédez-vous un permis de conduire et une carte grise à jour ?

## Annexe 2 : Exemple de calcul du prix

Course de la **Gare routière** à l'**Université Peleforo Gon Coulibaly**, tarif par défaut (50 FCFA/km, minimum 200 FCFA, arrondi à 25 FCFA), sans majoration :

1. Distance à vol d'oiseau (formule de haversine) ≈ 3,9 km.
2. Distance estimée par la route : 3,9 × 1,3 ≈ **5,1 km**.
3. Prix brut : 5,1 × 50 = 255 FCFA.
4. Arrondi supérieur à 25 FCFA : **275 FCFA** (supérieur au minimum de 200 FCFA).
5. De nuit, avec une majoration de 20 % : 255 × 1,2 = 306 → **325 FCFA**.

## Annexe 3 : Extrait de code — calcul du prix (règle RG24)

```ts
/** Prix d'un trajet : base + distance × prix au km, majoration éventuelle, minimum, arrondi. */
export function priceFor(distanceKm: number, pricing: PricingSettings = PRICING, surchargePercent = 0) {
  const raw = (pricing.baseFare + distanceKm * pricing.perKm) * (1 + surchargePercent / 100);
  return Math.max(pricing.minimumFare, Math.ceil(raw / pricing.roundTo) * pricing.roundTo);
}
```

## Annexe 4 : Extrait de code — acceptation d'une course sans double attribution (SAT de OP4)

```ts
// La course doit être encore demandée, et soit ouverte à tous, soit proposée à CE chauffeur.
const res = db
  .prepare(
    `UPDATE rides SET status = 'accepted', driver_id = ?, accepted_at = ?, offer_driver_id = NULL, offer_expires_at = NULL
      WHERE id = ? AND status = 'requested'
        AND (scheduled_at IS NULL OR scheduled_at <= ?)
        AND (dispatch_open = 1 OR (offer_driver_id = ? AND offer_expires_at > ?))`,
  )
  .run(user.id, now, rideId, visibleUntilIso(), user.id, now);
if (res.changes === 0) throw new HttpError(409, "Cette course n'est plus disponible.");
```

## Annexe 5 : Guide d'utilisation rapide

**Passager**
1. Ouvrez [À COMPLÉTER : adresse de l'application] et touchez « Commander une moto ».
2. Autorisez la localisation (votre position devient le point de départ).
3. Choisissez la destination : le prix s'affiche.
4. Touchez « Commander » (sans compte : nom, numéro, code reçu par SMS).
5. Suivez la moto sur la carte ; payez en espèces à l'arrivée ; notez le chauffeur.

**Chauffeur**
1. Inscrivez-vous (« Devenir chauffeur ») avec votre moto et votre permis.
2. Envoyez vos documents dans « Profil et documents ».
3. Après validation, choisissez un abonnement et payez-le au bureau SURPLACE.
4. Touchez « Passer en ligne » : les courses vous sont proposées avec un signal sonore.

**Administrateur**
1. Connectez-vous à [À COMPLÉTER : adresse de l'administration].
2. Traitez les éléments signalés par les pastilles rouges (urgences, chauffeurs à valider, paiements, réclamations).
3. Réglez les tarifs dans « Tarifs et réglages ».

## Annexe 6 : Glossaire des statuts

| Objet | Statuts |
|---|---|
| Course | demandée → acceptée → chauffeur arrivé → en cours → terminée ; ou annulée |
| Chauffeur | à valider → validé ; suspendu |
| Abonnement | en attente → payé ; refusé ; annulé |
| Proposition | en attente → acceptée / refusée / expirée ; annulée |
| Réclamation | ouverte → traitée |

<div style="page-break-after: always"></div>

# TABLE DES MATIÈRES

[À COMPLÉTER : générer automatiquement dans Word (Références › Table des matières) après avoir appliqué les styles de titres.]

DÉDICACE
REMERCIEMENTS
AVANT-PROPOS
LISTE DES SIGLES ET ABRÉVIATIONS
LISTE DES FIGURES
LISTE DES TABLEAUX
INTRODUCTION GÉNÉRALE

PREMIÈRE PARTIE : CADRE DE L'ÉTUDE ET ANALYSE DE L'EXISTANT
- Chapitre 1 : Présentation de la structure d'accueil
  - 1.1 Historique
  - 1.2 Missions et activités
  - 1.3 Organisation
  - 1.4 Fiche signalétique
  - 1.5 Déroulement du stage
- Chapitre 2 : Présentation du projet
  - 2.1 Contexte
  - 2.2 Problématique
  - 2.3 Objectifs
  - 2.4 Résultats attendus
  - 2.5 Périmètre du projet
  - 2.6 Acteurs du système
  - 2.7 Planning du projet
- Chapitre 3 : Étude et critique de l'existant
  - 3.1 Méthode de collecte des informations
  - 3.2 Description du fonctionnement actuel
  - 3.3 Critique de l'existant
  - 3.4 Solutions envisagées
  - 3.5 Solution retenue

DEUXIÈME PARTIE : ANALYSE ET CONCEPTION DU SYSTÈME D'INFORMATION (MÉTHODE MERISE)
- La méthode MERISE
- Chapitre 4 : Étude des données
  - 4.1 Les règles de gestion
  - 4.2 Le dictionnaire des données
  - 4.3 Les dépendances fonctionnelles
  - 4.4 Le graphe des dépendances fonctionnelles
  - 4.5 Le modèle conceptuel des données
  - 4.6 Le modèle logique des données relationnel
  - 4.7 Le modèle physique des données
- Chapitre 5 : Étude des traitements
  - 5.1 Le diagramme de contexte
  - 5.2 Le diagramme des flux
  - 5.3 Le modèle conceptuel des traitements
  - 5.4 Le modèle organisationnel des traitements
  - 5.5 Les schémas d'accès théorique
  - 5.6 Validation croisée données / traitements

TROISIÈME PARTIE : RÉALISATION ET MISE EN ŒUVRE
- Chapitre 6 : Environnement de développement et architecture
- Chapitre 7 : Présentation de l'application
- Chapitre 8 : Tests, déploiement, coût et bilan

CONCLUSION GÉNÉRALE
BIBLIOGRAPHIE ET WEBOGRAPHIE
GLOSSAIRE
ANNEXES
