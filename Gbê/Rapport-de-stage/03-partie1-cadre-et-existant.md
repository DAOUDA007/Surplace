# PREMIÈRE PARTIE : CADRE DE L'ÉTUDE ET ANALYSE DE L'EXISTANT

Cette première partie situe le projet dans son environnement. Elle présente la structure qui nous a accueilli(e), décrit le projet SURPLACE (contexte, objectifs, organisation), puis étudie le fonctionnement actuel du transport par taxi-moto à Korhogo afin d'en dégager les insuffisances et de justifier la solution retenue.

---

## CHAPITRE 1 : PRÉSENTATION DE LA STRUCTURE D'ACCUEIL

### 1.1 Historique

[À COMPLÉTER : date et contexte de création, fondateur(s), évolution, statut juridique (SARL, SA, entreprise individuelle, ONG…), numéro du registre de commerce si souhaité.]

### 1.2 Missions et activités

[À COMPLÉTER : domaines d'activité — ex. développement de logiciels et d'applications, maintenance informatique, réseaux, formation, conseil, transport…]

### 1.3 Organisation

[À COMPLÉTER : description des services ou départements et de leurs rôles.]

**Figure 1 : Organigramme de la structure d'accueil**

```
                    ┌──────────────────────────┐
                    │   DIRECTION GÉNÉRALE     │  [À COMPLÉTER]
                    └────────────┬─────────────┘
          ┌──────────────────────┼──────────────────────┐
┌─────────┴────────┐   ┌─────────┴────────┐   ┌─────────┴────────┐
│ Service technique│   │ Service commercial│   │ Administration   │
│ / informatique   │   │                  │   │ et finances      │
└─────────┬────────┘   └──────────────────┘   └──────────────────┘
          │
  ┌───────┴────────┐
  │  Stagiaire(s)  │  ← notre position durant le stage
  └────────────────┘
```

[À COMPLÉTER : remplacer par l'organigramme réel.]

### 1.4 Fiche signalétique

**Tableau 1 : Fiche signalétique de la structure d'accueil**

| Rubrique | Information |
|---|---|
| Raison sociale | [À COMPLÉTER] |
| Forme juridique | [À COMPLÉTER] |
| Date de création | [À COMPLÉTER] |
| Siège | [À COMPLÉTER : quartier, Korhogo] |
| Téléphone / e-mail | [À COMPLÉTER] |
| Responsable | [À COMPLÉTER] |
| Domaine d'activité | [À COMPLÉTER] |
| Effectif | [À COMPLÉTER] |

### 1.5 Déroulement du stage

[À COMPLÉTER : accueil, intégration, service d'affectation, tâches confiées en dehors du projet s'il y en a, rythme de travail, réunions avec le maître de stage.]

---

## CHAPITRE 2 : PRÉSENTATION DU PROJET

### 2.1 Contexte

Korhogo connaît une croissance démographique et urbaine importante. Les distances entre les quartiers (Soba, Petit-Paris, Koko, Haoussabougou, Résidentiel, Banaforo, Natiokobadara…) et les grands pôles d'activité (Grand marché, gare routière, Centre Hospitalier Régional, Université Peleforo Gon Coulibaly, aéroport) rendent indispensable un moyen de transport rapide et abordable. Le **taxi-moto** répond à ce besoin et s'est largement imposé auprès de la population.

Dans le même temps, l'usage du **téléphone portable** et de l'internet mobile s'est généralisé, y compris dans les villes de l'intérieur du pays. Cette évolution rend possible un service numérique de mise en relation, à condition qu'il soit adapté aux réalités locales : téléphones d'entrée de gamme, connexion parfois faible, paiement en espèces, utilisateurs peu habitués aux applications complexes.

### 2.2 Problématique

Le fonctionnement actuel du taxi-moto à Korhogo pose plusieurs problèmes, détaillés au chapitre 3 :

- le passager ne sait pas **quand** une moto passera, ni **à quel prix** il sera transporté ;
- la **sécurité** n'est pas assurée : le conducteur n'est pas identifié et la course ne laisse aucune trace ;
- les conducteurs **perdent du temps et du carburant** à chercher des clients ;
- il n'existe **aucun outil** pour organiser l'activité, vérifier les conducteurs ou traiter les réclamations.

D'où la question centrale :

> **Comment mettre en relation, de manière simple, sûre et transparente, les passagers et les conducteurs de taxi-moto de Korhogo, tout en donnant à l'exploitant les outils pour organiser et contrôler l'activité ?**

### 2.3 Objectifs

**Objectif général** : concevoir et réaliser une application web de commande et de gestion de taxis-motos adaptée à la ville de Korhogo.

**Objectifs spécifiques** :

1. Permettre à un passager de **commander une course** en quelques gestes, avec ou sans compte, en connaissant le **prix à l'avance**.
2. Permettre aux chauffeurs de **recevoir les demandes proches** d'eux et de les accepter, et attribuer automatiquement chaque demande au chauffeur disponible le plus proche.
3. Permettre le **suivi en temps réel** de la moto sur une carte et le **partage** de la course avec un proche.
4. Renforcer la **sécurité** : vérification des numéros par SMS, contrôle des documents des chauffeurs (permis, carte grise, pièce d'identité, photo), bouton d'urgence, notes mutuelles, réclamations.
5. Offrir à l'exploitant un **espace d'administration** : validation des chauffeurs, abonnements, suivi des courses, tarifs réglables, rapports et exports, journal des actions.
6. Proposer un **modèle économique** simple et équitable : aucun prélèvement sur les courses, un abonnement mensuel ou annuel pour les chauffeurs.

### 2.4 Résultats attendus

- une application web **installable sur le téléphone**, utilisable par les passagers et les chauffeurs ;
- un site d'**administration** distinct réservé à l'équipe ;
- une **base de données** cohérente et sécurisée, conçue selon MERISE ;
- une application **testée** et **mise en ligne** ;
- une **documentation** technique et utilisateur.

### 2.5 Périmètre du projet

| Inclus | Exclus (volontairement) |
|---|---|
| Commande de courses immédiates ou réservées, pour soi ou pour un proche | Paiement électronique (Mobile Money) : les courses se paient en espèces |
| Attribution automatique et suivi en temps réel | Codes promotionnels pour les passagers |
| Gestion des chauffeurs, documents et abonnements | Application native publiée sur Play Store / App Store (l'application web est installable) |
| Sécurité : SMS, urgence, notes, réclamations | Fonctionnement sur plusieurs serveurs simultanés |
| Administration, tarifs, rapports, exports, journal | |

### 2.6 Acteurs du système

| Acteur | Rôle |
|---|---|
| **Passager** | Personne qui commande une course (avec un compte, ou en invité) |
| **Chauffeur** | Conducteur de taxi-moto inscrit, validé et abonné, qui réalise les courses |
| **Administrateur** | Membre de l'équipe SURPLACE ; selon son rôle : accès complet, opérations, finances ou modération. Un **administrateur principal** gère l'équipe |
| **Proche** | Personne à qui un passager envoie le lien de suivi de sa course ; ne possède pas de compte |
| **Fournisseurs externes** | Opérateur SMS, service de cartographie (OpenStreetMap), services de notification des navigateurs |

### 2.7 Planning du projet

**Tableau 2 : Planning prévisionnel du projet**

| N° | Tâche | Durée | Période |
|---|---|---|---|
| 1 | Prise de contact, compréhension du besoin | [À COMPLÉTER] | [À COMPLÉTER] |
| 2 | Enquête et étude de l'existant | [À COMPLÉTER] | [À COMPLÉTER] |
| 3 | Analyse et conception MERISE (données) | [À COMPLÉTER] | [À COMPLÉTER] |
| 4 | Analyse et conception MERISE (traitements) | [À COMPLÉTER] | [À COMPLÉTER] |
| 5 | Mise en place de l'environnement et de la base de données | [À COMPLÉTER] | [À COMPLÉTER] |
| 6 | Développement de l'API (serveur) | [À COMPLÉTER] | [À COMPLÉTER] |
| 7 | Développement de l'application passagers / chauffeurs | [À COMPLÉTER] | [À COMPLÉTER] |
| 8 | Développement de l'espace d'administration | [À COMPLÉTER] | [À COMPLÉTER] |
| 9 | Fonctionnalités de sécurité et de confort | [À COMPLÉTER] | [À COMPLÉTER] |
| 10 | Tests et corrections | [À COMPLÉTER] | [À COMPLÉTER] |
| 11 | Déploiement en ligne | [À COMPLÉTER] | [À COMPLÉTER] |
| 12 | Rédaction du rapport | [À COMPLÉTER] | [À COMPLÉTER] |

**Figure 2 : Diagramme de Gantt du projet**

```
Tâche                         S1  S2  S3  S4  S5  S6  S7  S8  S9  S10 S11 S12
1  Compréhension du besoin    ███
2  Étude de l'existant           ███ ███
3  MERISE — données                      ███ ███
4  MERISE — traitements                      ███ ███
5  Environnement, base                           ███
6  API (serveur)                                 ███ ███ ███
7  Application passagers/chauffeurs                  ███ ███ ███
8  Administration                                        ███ ███
9  Sécurité, confort                                         ███ ███
10 Tests et corrections                                          ███ ███
11 Déploiement                                                       ███
12 Rapport                                           ███ ███ ███ ███ ███ ███
```

[À COMPLÉTER : adapter le nombre de semaines (S1…) à la durée réelle de votre stage.]

---

## CHAPITRE 3 : ÉTUDE ET CRITIQUE DE L'EXISTANT

### 3.1 Méthode de collecte des informations

Pour comprendre le fonctionnement actuel, nous avons utilisé :

- l'**observation directe** aux points de forte affluence (Grand marché, gare routière, abords de l'université et du CHR) ;
- des **entretiens** avec des conducteurs de taxi-moto et des usagers ;
- un **questionnaire** court [À COMPLÉTER : nombre de personnes interrogées, période, lieux] ;
- l'étude des **applications existantes** de mise en relation passagers-conducteurs dans d'autres villes.

[À COMPLÉTER : résumer ici les résultats chiffrés de votre enquête — par exemple la part des usagers qui négocient le prix, qui disposent d'un smartphone avec internet, qui ont déjà eu un litige ou oublié un objet, le temps d'attente moyen ressenti, la part des conducteurs intéressés par un abonnement. N'indiquez que des chiffres réellement mesurés.]

### 3.2 Description du fonctionnement actuel

Le déroulement d'une course en taxi-moto, tel qu'observé, se résume ainsi :

1. Le passager se rend **au bord de la route** et attend qu'une moto libre passe ; ou bien il **appelle** un conducteur qu'il connaît.
2. Il indique sa destination ; le conducteur annonce un prix.
3. Les deux **négocient** jusqu'à un accord.
4. Le conducteur transporte le passager.
5. Le passager **paie en espèces** à l'arrivée.
6. Aucune trace de la course n'est conservée.

De son côté, le conducteur circule dans la ville ou stationne à un carrefour en attendant les clients. L'organisation de la profession, quand elle existe, repose sur des regroupements informels ou des syndicats, sans outil numérique de suivi.

**Figure 3 : Circuit actuel d'une course en taxi-moto**

```
  PASSAGER                                   CONDUCTEUR
     │                                            │
     │  attend au bord de la route ou appelle     │  circule à la recherche
     │──────────────────────────────────────────►│  de clients
     │                                            │
     │  indique la destination                    │
     │──────────────────────────────────────────►│
     │                     annonce un prix        │
     │◄──────────────────────────────────────────│
     │        négociation (plusieurs échanges)    │
     │◄─────────────────────────────────────────►│
     │                                            │
     │                transport                   │
     │                                            │
     │  paiement en espèces                       │
     │──────────────────────────────────────────►│
     │                                            │
     ▼   aucune trace, aucun suivi, aucun recours ▼
```

### 3.3 Critique de l'existant

**Tableau 3 : Critique de l'existant**

| Points forts | Points faibles |
|---|---|
| Moyen de transport **disponible** dans tous les quartiers | **Attente** imprévisible, surtout le soir, sous la pluie ou dans les quartiers périphériques |
| **Rapide** et adapté aux voies étroites | **Prix négocié** à chaque course, différent d'un passager à l'autre : sentiment d'injustice, perte de temps |
| Paiement **simple** en espèces | **Sécurité** insuffisante : conducteur non identifié, aucune trace de la course, impossible de prévenir un proche ou de donner l'alerte |
| Relation de **confiance** avec les conducteurs habituels | **Objets oubliés** et **litiges** difficiles à régler : on ne sait pas qui contacter |
| Source de **revenus** importante pour de nombreux jeunes | Conducteurs qui **circulent à vide** : perte de carburant et de revenus |
| | **Aucun contrôle** des documents (permis, carte grise, assurance) |
| | Aucune **donnée** pour organiser l'activité (zones et heures de forte demande) |
| | Les applications internationales prélèvent une **commission** sur chaque course et imposent souvent le paiement électronique |

### 3.4 Solutions envisagées

Plusieurs solutions ont été étudiées.

**Tableau 4 : Comparaison des solutions envisagées**

| Critère | Application mobile native (Android) | Service USSD / SMS | **Application web installable (retenue)** |
|---|---|---|---|
| Installation | Téléchargement depuis le Play Store, espace de stockage | Aucune | Aucune (lien) ; installable sur l'écran d'accueil en un geste |
| Carte et suivi en temps réel | Oui | Non | Oui |
| Fonctionne sur tous les téléphones | Android uniquement (une seconde version pour iPhone) | Oui, même sans smartphone | Tous les smartphones avec un navigateur |
| Coût de développement | Élevé (deux applications) | Moyen, mais coûts d'opérateur | Faible (une seule base de code) |
| Mise à jour | Nouvelle version à télécharger | Côté opérateur | Immédiate pour tous les utilisateurs |
| Notifications téléphone | Oui | SMS payants | Oui (notifications push web) |
| Espace d'administration | À développer à part | À développer à part | Même technologie, site séparé |

### 3.5 Solution retenue

Nous avons retenu une **application web progressive (PWA)**, composée de trois programmes :

1. une **API** (serveur) qui centralise les données et les règles : tarifs, attribution des courses, sécurité, abonnements ;
2. une **Application** pour les passagers et les chauffeurs, utilisable dans le navigateur et installable sur le téléphone ;
3. un site d'**Administration** séparé pour l'équipe.

Les choix fonctionnels principaux sont les suivants :

- **prix fixé à l'avance**, calculé par le serveur à partir de la distance (tarif au kilomètre, minimum, majorations de nuit et de pluie réglables) : plus de négociation ;
- **commande sans compte** possible (nom, numéro vérifié par SMS), pour ne pas décourager les nouveaux utilisateurs ;
- **paiement en espèces** au chauffeur, conformément aux habitudes ;
- **modèle par abonnement** pour les chauffeurs (mensuel ou annuel), **sans commission** ;
- **sécurité** : chauffeurs validés avec leurs documents, suivi partagé, bouton d'urgence, notes mutuelles, journal des actions ;
- **simplicité** : mode « gros caractères », annonces vocales, faible consommation de données.

La deuxième partie décrit la conception détaillée de ce système selon la méthode MERISE.
