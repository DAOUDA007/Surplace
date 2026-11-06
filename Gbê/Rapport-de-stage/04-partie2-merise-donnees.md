# DEUXIÈME PARTIE : ANALYSE ET CONCEPTION DU SYSTÈME D'INFORMATION (MÉTHODE MERISE)

Cette partie présente la conception du système d'information de SURPLACE. Après une présentation rapide de la méthode MERISE, le chapitre 4 traite des **données** (de la règle de gestion jusqu'au modèle physique) et le chapitre 5 des **traitements** (du diagramme des flux jusqu'au modèle organisationnel et aux schémas d'accès).

---

## La méthode MERISE

### Présentation

**MERISE** (Méthode d'Étude et de Réalisation Informatique pour les Systèmes d'Entreprise) est une méthode française de conception de systèmes d'information, apparue à la fin des années 1970. Elle repose sur trois principes :

- la **séparation des données et des traitements** : les données (ce que l'on mémorise) et les traitements (ce que l'on fait) sont étudiés séparément, puis confrontés ;
- une **approche par niveaux d'abstraction** : on décrit d'abord **quoi** (niveau conceptuel), puis **qui, où, quand** (niveau organisationnel), puis **comment** (niveaux logique et physique) ;
- un **cycle de vie** du projet : étude préalable, étude détaillée, réalisation, mise en œuvre.

**Figure 4 : Cycle d'abstraction de la méthode MERISE**

```
                     DONNÉES                          TRAITEMENTS
                ┌──────────────────┐              ┌──────────────────────────┐
 CONCEPTUEL     │  MCD             │              │  MCC (flux)  →  MCT      │   QUOI ?
 (invariant)    │  (entités,       │◄────────────►│  (événements, opérations,│
                │   associations)  │  validation  │   résultats)             │
                └────────┬─────────┘              └────────────┬─────────────┘
                         │                                     │
 ORGANISATIONNEL         │                        ┌────────────┴─────────────┐
 (qui, où, quand)        │                        │  MOT (postes, procédures,│   QUI ? OÙ ? QUAND ?
                         │                        │  nature des tâches)      │
                         │                        └────────────┬─────────────┘
                ┌────────┴─────────┐              ┌────────────┴─────────────┐
 LOGIQUE        │  MLD-R           │◄────────────►│  SAT (accès aux données) │   COMMENT ? (logique)
                │  (relations)     │              │                          │
                └────────┬─────────┘              └────────────┬─────────────┘
                ┌────────┴─────────┐              ┌────────────┴─────────────┐
 PHYSIQUE       │  MPD (tables SQL)│              │  Programmes              │   COMMENT ? (technique)
                └──────────────────┘              └──────────────────────────┘
```

### Justification du choix

Nous avons retenu MERISE parce que :

- le cœur de SURPLACE est une **base de données relationnelle** (comptes, courses, abonnements, documents…) : MERISE est particulièrement adaptée à la conception de ce type de base ;
- la méthode est **enseignée** dans notre formation et **reconnue** dans les entreprises ivoiriennes et francophones ;
- ses modèles sont **lisibles par des non-informaticiens** (règles de gestion, MCT), ce qui facilite les échanges avec le maître de stage et les futurs utilisateurs.

---

## CHAPITRE 4 : ÉTUDE DES DONNÉES

### 4.1 Les règles de gestion

Les règles de gestion traduisent les contraintes du domaine. Elles ont été établies à partir de l'étude de l'existant, des entretiens et des choix de la structure d'accueil. Elles guident toute la conception (cardinalités, attributs, traitements).

**Tableau 5 : Règles de gestion**

| N° | Règle de gestion |
|---|---|
| **Utilisateurs et comptes** | |
| RG01 | Un utilisateur a un seul **rôle** : passager, chauffeur ou administrateur. |
| RG02 | Un utilisateur s'identifie par son **numéro de téléphone** (10 chiffres commençant par 0, préfixe +225 accepté). Un numéro ne peut appartenir qu'à un seul compte. |
| RG03 | Le **code PIN** comporte 4 chiffres. Il n'est jamais conservé en clair, seulement sous forme d'empreinte (hachage). |
| RG04 | Une **session** de connexion est valable 30 jours. Un utilisateur peut avoir plusieurs sessions (plusieurs appareils). |
| RG05 | Après **5 codes PIN erronés** pour un même numéro en 15 minutes, les tentatives de connexion sont bloquées temporairement. |
| RG06 | Un **code de vérification SMS** comporte 6 chiffres, est valable 10 minutes et accepte au plus 5 essais. Au plus 3 codes peuvent être demandés pour un numéro en 15 minutes. |
| RG07 | Un passager peut **commander sans compte** (passager invité) en donnant son nom et son numéro, vérifié par SMS. Il peut ensuite créer son compte en conservant ses courses. |
| RG08 | Un utilisateur peut indiquer une **personne à prévenir** en cas d'urgence (nom et numéro). |
| RG09 | Un compte supprimé qui possède des courses est **anonymisé** (nom et numéro effacés, connexion impossible) afin de conserver l'historique. |
| **Chauffeurs** | |
| RG10 | Un **chauffeur** est un utilisateur qui possède une moto (immatriculation, modèle) et un permis de conduire. |
| RG11 | Un chauffeur nouvellement inscrit est **« à valider »**. Seul un administrateur peut le **valider** ou le **suspendre**. |
| RG12 | Un chauffeur fournit au plus **un document de chaque type** : photo du visage, permis, carte grise, pièce d'identité (obligatoires) et attestation d'assurance (facultative). Le permis et l'assurance ont une **date d'expiration**. |
| RG13 | Lorsque le réglage « documents obligatoires » est activé, un chauffeur dont un document est manquant ou expiré ne peut pas passer en ligne. |
| RG14 | Un chauffeur ne peut **passer en ligne** que s'il est validé et possède un **abonnement actif**. |
| RG15 | Un chauffeur validé qui change de moto, de permis ou de document d'identité repasse **« à valider »**. |
| RG16 | Un chauffeur peut avoir été **parrainé** par un seul autre chauffeur ; un chauffeur peut parrainer plusieurs chauffeurs. |
| **Abonnements** | |
| RG17 | Il existe deux **formules** : mensuelle (1 mois) et annuelle (12 mois). Leurs prix sont réglables par l'administration (par défaut 1 000 FCFA et 10 000 FCFA). |
| RG18 | Un chauffeur ne peut avoir qu'**une seule demande d'abonnement en attente**. |
| RG19 | Un abonnement devient actif quand un administrateur **confirme le paiement**. La nouvelle période commence à la **fin de l'abonnement en cours** s'il est encore valable, sinon immédiatement. |
| RG20 | À l'expiration de l'abonnement, le chauffeur est mis hors ligne, sauf s'il termine une course. Il est **prévenu 3 jours puis 1 jour** avant l'expiration. |
| RG21 | Quand un chauffeur parrainé paie son **premier abonnement**, son parrain reçoit un nombre de **jours d'abonnement offerts** (réglable, 7 par défaut). |
| **Courses** | |
| RG22 | Une course est commandée par **un seul passager** et réalisée par **au plus un chauffeur**. |
| RG23 | Un passager ne peut avoir qu'**une course en cours ou réservée** à la fois ; un chauffeur, qu'une course en cours. |
| RG24 | Le **prix** est calculé par le système à la commande, puis figé : *prix = max(prix minimum ; arrondi supérieur à 25 FCFA de [(prise en charge + distance × prix au km) × (1 + majoration %)])*. Par défaut : 50 FCFA/km, minimum 200 FCFA, prise en charge 0. |
| RG25 | La **distance** est mesurée par la route quand un service d'itinéraire est disponible ; sinon, distance à vol d'oiseau × 1,3. Une course doit faire entre **0,2 km et 40 km**. |
| RG26 | Des **majorations** s'appliquent selon l'heure de prise en charge : nuit (plage horaire et pourcentage réglables) et pluie (activée manuellement). |
| RG27 | Le **paiement** se fait en espèces au chauffeur. |
| RG28 | Une course peut être **réservée** de 20 minutes à 7 jours à l'avance. Elle n'est visible des chauffeurs que 15 minutes avant l'heure prévue. |
| RG29 | Une course peut être commandée **pour un proche** : le nom et le numéro de la personne transportée sont alors indiqués. |
| RG30 | Les **étapes** d'une course sont : demandée → acceptée → chauffeur arrivé → en cours → terminée. Une course peut être annulée avant de démarrer. |
| RG31 | Une demande est d'abord **proposée** au chauffeur disponible le plus proche (≤ 10 km, en ligne, validé, abonné, libre, position récente) pendant **20 secondes**, puis au suivant. Après **3 chauffeurs** ou s'il n'y en a aucun, elle est **ouverte à tous** les chauffeurs situés à moins de 10 km. |
| RG32 | Un chauffeur qui **refuse** une course, ou qui l'**annule** après l'avoir acceptée, ne se la voit plus proposer. Une course annulée par le chauffeur revient en attente. |
| RG33 | Une demande restée sans chauffeur est **annulée automatiquement 5 minutes** après l'heure prévue. |
| RG34 | Le numéro du passager n'est communiqué au chauffeur **qu'après acceptation**. |
| RG35 | Après une course terminée, le passager peut **noter le chauffeur** et le chauffeur peut **noter le passager** (de 1 à 5, commentaire facultatif). Chaque note n'est donnée qu'une fois. |
| RG36 | Les avis peuvent être **masqués ou supprimés** par l'administration. |
| RG37 | Le **lien de suivi partagé** d'une course ne révèle pas le numéro du passager et reste valable jusqu'à 1 heure après la fin de la course. |
| **Sécurité et relation client** | |
| RG38 | Une **alerte d'urgence** prévient immédiatement l'équipe et envoie un SMS à la personne à prévenir. Un utilisateur peut déclencher au plus 3 alertes en 10 minutes. |
| RG39 | Une **réclamation** porte sur une catégorie (objet perdu, prix, comportement, sécurité, itinéraire, autre), éventuellement sur une course de son auteur. Un utilisateur a au plus 5 réclamations en cours. |
| RG40 | Un passager enregistre au plus **20 lieux favoris**, dont un seul « Maison » et un seul « Travail ». |
| RG41 | Le formulaire de contact accepte au plus 3 messages en 10 minutes par adresse. |
| **Administration** | |
| RG42 | Un administrateur a un **rôle** : accès complet, opérations, finances ou modération, qui détermine les écrans et actions autorisés. |
| RG43 | Il existe toujours **un seul administrateur principal**. Lui seul ajoute, suspend, supprime les administrateurs et change leurs rôles. |
| RG44 | Toute **action d'administration** est inscrite dans un journal (auteur, action, cible, date, adresse). |

### 4.2 Le dictionnaire des données

Le dictionnaire des données recense toutes les informations élémentaires du système, avec leur type et leur taille.

**Légende**
- **Type** : AN = alphanumérique ; N = numérique entier ; R = numérique décimal (réel) ; D = date ; DH = date et heure ; B = booléen (oui/non).
- **Nature** : E = élémentaire ; C = calculée ; C\* = calculée mais **mémorisée** (pour figer une valeur ou accélérer l'affichage) ; S = signalétique (identifiant).

#### 4.2.1 Dictionnaire brut et épuration

Le recensement initial (entretiens, documents, maquettes d'écrans) a produit un **dictionnaire brut**, qui a été **épuré** selon les règles suivantes :

| Anomalie | Exemple dans le dictionnaire brut | Traitement |
|---|---|---|
| **Synonymes** (deux noms, une même information) | « numéro du client », « téléphone du passager », « contact » | Une seule donnée : `tel_util` |
| **Polysèmes** (un nom, plusieurs informations) | « date » (de la demande, de l'acceptation, de la fin…) | Une donnée par sens : `date_demande`, `date_acceptation`, `date_fin`… |
| **Données calculées non mémorisées** | note moyenne d'un chauffeur, gains du jour, jours d'abonnement restants, durée estimée | Retirées du dictionnaire épuré, décrites à part (§ 4.2.3) avec leur règle de calcul |
| **Données composées** | « position » | Décomposée en latitude et longitude |
| **Données constantes** | « mode de paiement = espèces » | Conservée (une évolution vers le paiement mobile est prévue) |

#### 4.2.2 Dictionnaire des données épuré

**Tableau 7 : Dictionnaire des données épuré**

| N° | Code | Désignation | Type | Taille | Nature | Observations |
|---|---|---|---|---|---|---|
| | **Utilisateur** | | | | | |
| 1 | id_util | Identifiant de l'utilisateur | N | 10 | S | Numéro attribué automatiquement |
| 2 | nom_util | Nom complet | AN | 80 | E | Obligatoire |
| 3 | tel_util | Numéro de téléphone de connexion | AN | 20 | E | Unique (RG02). Pour un invité : valeur technique unique |
| 4 | email_util | Adresse e-mail | AN | 120 | E | Facultative |
| 5 | empreinte_pin | Empreinte du code PIN | AN | 100 | E | Sel + hachage scrypt (RG03) |
| 6 | role_util | Rôle | AN | 10 | E | passager, chauffeur, administrateur |
| 7 | date_inscription | Date d'inscription | DH | | E | |
| 8 | est_bloque | Compte bloqué | B | 1 | E | |
| 9 | est_principal | Administrateur principal | B | 1 | E | Un seul à la fois (RG43) |
| 10 | role_admin | Rôle d'administrateur | AN | 12 | E | complet, opérations, finances, modération |
| 11 | est_invite | Passager invité | B | 1 | E | RG07 |
| 12 | tel_invite | Numéro réel d'un passager invité | AN | 10 | E | |
| 13 | nom_contact_urg | Nom de la personne à prévenir | AN | 80 | E | RG08 |
| 14 | tel_contact_urg | Numéro de la personne à prévenir | AN | 10 | E | |
| 15 | somme_notes_pass | Cumul des notes reçues par le passager | N | 6 | C\* | Σ notes données par les chauffeurs |
| 16 | nb_notes_pass | Nombre de notes reçues par le passager | N | 6 | C\* | |
| 17 | code_parrainage | Code de parrainage | AN | 8 | E | Ex. SP7K2QX, unique |
| 18 | date_suppression | Date de suppression (anonymisation) | DH | | E | RG09 |
| | **Chauffeur** | | | | | |
| 19 | immatriculation | Immatriculation de la moto | AN | 20 | E | En majuscules |
| 20 | modele_moto | Marque et modèle de la moto | AN | 40 | E | |
| 21 | num_permis | Numéro du permis de conduire | AN | 30 | E | 5 à 30 caractères |
| 22 | statut_chauffeur | Statut de validation | AN | 10 | E | à valider, validé, suspendu |
| 23 | est_en_ligne | Chauffeur en ligne | B | 1 | E | |
| 24 | lat_chauffeur | Latitude de la dernière position | R | 9,6 | E | |
| 25 | lng_chauffeur | Longitude de la dernière position | R | 9,6 | E | |
| 26 | date_position | Date de la dernière position | DH | | E | |
| 27 | somme_notes_chauf | Cumul des notes reçues par le chauffeur | N | 6 | C\* | |
| 28 | nb_notes_chauf | Nombre de notes reçues par le chauffeur | N | 6 | C\* | |
| 29 | date_fin_abo | Date de fin de l'abonnement en cours | DH | | C\* | Prolongée à chaque paiement (RG19) |
| 30 | recompense_versee | Récompense de parrainage déjà donnée | B | 1 | E | RG21 |
| 31 | date_rappel_j3 | Échéance déjà rappelée à J-3 | DH | | E | Évite les rappels en double |
| 32 | date_rappel_j1 | Échéance déjà rappelée à J-1 | DH | | E | |
| | **Course** | | | | | |
| 33 | id_course | Numéro de la course | N | 10 | S | |
| 34 | statut_course | Statut | AN | 12 | E | demandée, acceptée, arrivé, en cours, terminée, annulée |
| 35 | lib_depart | Libellé du lieu de départ | AN | 200 | E | |
| 36 | lat_depart | Latitude du départ | R | 9,6 | E | |
| 37 | lng_depart | Longitude du départ | R | 9,6 | E | |
| 38 | lib_arrivee | Libellé de la destination | AN | 200 | E | |
| 39 | lat_arrivee | Latitude de la destination | R | 9,6 | E | |
| 40 | lng_arrivee | Longitude de la destination | R | 9,6 | E | |
| 41 | distance_km | Distance du trajet | R | 4,1 | C\* | RG25, figée à la commande |
| 42 | prix_course | Prix de la course (FCFA) | N | 6 | C\* | RG24, figé à la commande |
| 43 | mode_paiement | Mode de paiement | AN | 10 | E | espèces |
| 44 | date_demande | Date et heure de la demande | DH | | E | |
| 45 | date_reservation | Heure de prise en charge réservée | DH | | E | Vide si immédiate (RG28) |
| 46 | date_acceptation | Date d'acceptation par le chauffeur | DH | | E | |
| 47 | date_arrivee_chauf | Date d'arrivée du chauffeur au départ | DH | | E | |
| 48 | date_debut | Date de début du trajet | DH | | E | |
| 49 | date_fin | Date de fin du trajet | DH | | E | |
| 50 | date_annulation | Date d'annulation | DH | | E | |
| 51 | annule_par | Auteur de l'annulation | AN | 10 | E | passager, administrateur, délai dépassé |
| 52 | note_chauffeur | Note donnée au chauffeur | N | 1 | E | 1 à 5 (RG35) |
| 53 | commentaire_passager | Commentaire du passager | AN | 500 | E | |
| 54 | note_passager | Note donnée au passager | N | 1 | E | 1 à 5 |
| 55 | commentaire_chauffeur | Commentaire du chauffeur | AN | 500 | E | |
| 56 | avis_masque | Avis masqué par l'administration | B | 1 | E | RG36 |
| 57 | nom_beneficiaire | Nom de la personne transportée | AN | 80 | E | RG29 |
| 58 | tel_beneficiaire | Numéro de la personne transportée | AN | 10 | E | |
| 59 | jeton_partage | Jeton secret du lien de suivi | AN | 20 | E | Unique (RG37) |
| 60 | date_fin_offre | Fin du délai de réponse du chauffeur sollicité | DH | | E | RG31 |
| 61 | ouverte_a_tous | Course ouverte à tous les chauffeurs proches | B | 1 | E | RG31 |
| 62 | source_itineraire | Mode de calcul de la distance | AN | 10 | E | route, estimation |
| | **Proposition** (lien course – chauffeur) | | | | | |
| 63 | date_proposition | Date de la proposition | DH | | E | |
| 64 | reponse_proposition | Réponse du chauffeur | AN | 10 | E | en attente, acceptée, refusée, expirée, annulée |
| | **Abonnement** | | | | | |
| 65 | id_abo | Numéro de l'abonnement | N | 10 | S | |
| 66 | formule | Formule | AN | 10 | E | mensuelle, annuelle (RG17) |
| 67 | montant_abo | Montant (FCFA) | N | 8 | E | Prix en vigueur à la demande |
| 68 | statut_abo | Statut | AN | 10 | E | en attente, payé, refusé, annulé |
| 69 | date_demande_abo | Date de la demande | DH | | E | |
| 70 | date_paiement | Date du paiement confirmé | DH | | E | |
| 71 | date_debut_abo | Début de la période couverte | DH | | E | |
| 72 | date_fin_periode | Fin de la période couverte | DH | | E | |
| | **Document** | | | | | |
| 73 | id_doc | Numéro du document | N | 10 | S | |
| 74 | type_doc | Type de document | AN | 15 | E | photo, permis, carte grise, pièce d'identité, assurance |
| 75 | fichier_doc | Nom du fichier image | AN | 100 | E | Nom aléatoire |
| 76 | type_mime | Format de l'image | AN | 20 | E | JPEG, PNG, WebP |
| 77 | date_expiration_doc | Date d'expiration | D | | E | Permis et assurance (RG12) |
| 78 | date_rappel_doc | Échéance déjà rappelée | D | | E | |
| 79 | date_envoi_doc | Date d'envoi | DH | | E | |
| | **Session** | | | | | |
| 80 | jeton_session | Jeton de session | AN | 64 | S | Aléatoire, contenu du cookie |
| 81 | date_expiration_session | Date d'expiration | DH | | E | + 30 jours (RG04) |
| | **Lieu favori** | | | | | |
| 82 | id_favori | Numéro du lieu favori | N | 10 | S | |
| 83 | type_favori | Type | AN | 6 | E | maison, travail, autre (RG40) |
| 84 | lib_favori | Libellé | AN | 200 | E | |
| 85 | lat_favori | Latitude | R | 9,6 | E | |
| 86 | lng_favori | Longitude | R | 9,6 | E | |
| 87 | date_ajout_favori | Date d'ajout | DH | | E | |
| | **Alerte d'urgence** | | | | | |
| 88 | id_alerte | Numéro de l'alerte | N | 10 | S | |
| 89 | lat_alerte | Latitude au moment de l'alerte | R | 9,6 | E | Si disponible |
| 90 | lng_alerte | Longitude | R | 9,6 | E | |
| 91 | date_alerte | Date de l'alerte | DH | | E | |
| 92 | date_traitement_alerte | Date de traitement | DH | | E | |
| 93 | traitee_par | Nom de l'administrateur ayant traité | AN | 80 | E | |
| 94 | note_traitement | Note de traitement | AN | 1000 | E | |
| | **Réclamation** | | | | | |
| 95 | id_reclam | Numéro de la réclamation | N | 10 | S | |
| 96 | categorie_reclam | Catégorie | AN | 30 | E | RG39 |
| 97 | message_reclam | Description | AN | 2000 | E | 10 caractères minimum |
| 98 | statut_reclam | Statut | AN | 10 | E | ouverte, traitée |
| 99 | reponse_admin | Réponse de l'équipe | AN | 1000 | E | |
| 100 | date_reclam | Date de dépôt | DH | | E | |
| 101 | date_resolution | Date de traitement | DH | | E | |
| | **Notification** | | | | | |
| 102 | id_notif | Numéro de la notification | N | 10 | S | |
| 103 | titre_notif | Titre | AN | 80 | E | |
| 104 | contenu_notif | Texte | AN | 500 | E | |
| 105 | lien_notif | Page à ouvrir | AN | 200 | E | |
| 106 | date_notif | Date d'envoi | DH | | E | |
| 107 | date_lecture | Date de lecture | DH | | E | Vide = non lue |
| | **Période en ligne** | | | | | |
| 108 | id_periode | Numéro de la période | N | 10 | S | |
| 109 | debut_periode | Début de la période en ligne | DH | | E | |
| 110 | fin_periode | Fin de la période en ligne | DH | | E | Vide = toujours en ligne |
| | **Abonnement aux notifications push** | | | | | |
| 111 | id_push | Numéro | N | 10 | S | |
| 112 | adresse_push | Adresse d'envoi fournie par le navigateur | AN | 500 | E | Unique |
| 113 | cles_push | Clés de chiffrement | AN | 300 | E | |
| 114 | date_abonnement_push | Date d'abonnement | DH | | E | |
| | **Journal des actions** | | | | | |
| 115 | id_action | Numéro de l'action | N | 10 | S | |
| 116 | nom_admin_action | Nom de l'administrateur (au moment de l'action) | AN | 80 | E | Conservé même si le compte est supprimé |
| 117 | libelle_action | Action réalisée | AN | 100 | E | Ex. « Chauffeur validé » |
| 118 | cible_action | Objet concerné | AN | 100 | E | Ex. « chauffeur #12 » |
| 119 | details_action | Détails | AN | 2000 | E | Codes PIN et images masqués |
| 120 | adresse_ip | Adresse réseau | AN | 45 | E | |
| 121 | date_action | Date de l'action | DH | | E | |
| | **Message de contact** | | | | | |
| 122 | id_message | Numéro du message | N | 10 | S | |
| 123 | nom_expediteur | Nom de l'expéditeur | AN | 80 | E | |
| 124 | contact_expediteur | Téléphone ou e-mail de l'expéditeur | AN | 120 | E | |
| 125 | sujet_message | Sujet | AN | 120 | E | |
| 126 | contenu_message | Message | AN | 2000 | E | |
| 127 | date_message | Date | DH | | E | |
| 128 | message_traite | Message traité | B | 1 | E | |
| | **Lieu fréquent** | | | | | |
| 129 | id_lieu | Numéro du lieu | N | 10 | S | |
| 130 | lib_lieu | Nom du lieu | AN | 120 | E | Ex. « Gare routière » |
| 131 | lat_lieu | Latitude | R | 9,6 | E | |
| 132 | lng_lieu | Longitude | R | 9,6 | E | |
| 133 | lieu_actif | Proposé aux passagers | B | 1 | E | |
| 134 | ordre_lieu | Ordre d'affichage | N | 3 | E | |
| | **Diffusion (message groupé)** | | | | | |
| 135 | id_diffusion | Numéro | N | 10 | S | |
| 136 | public_cible | Destinataires | AN | 60 | E | Ex. « Chauffeurs en ligne » |
| 137 | titre_diffusion | Titre | AN | 80 | E | |
| 138 | contenu_diffusion | Message | AN | 500 | E | |
| 139 | avec_sms | Envoyé aussi par SMS | B | 1 | E | |
| 140 | nb_destinataires | Nombre de destinataires | N | 6 | C\* | |
| 141 | nom_admin_diffusion | Administrateur émetteur | AN | 80 | E | |
| 142 | date_diffusion | Date d'envoi | DH | | E | |
| | **Code de vérification** | | | | | |
| 143 | id_code | Numéro | N | 10 | S | |
| 144 | tel_code | Numéro de téléphone vérifié | AN | 10 | E | |
| 145 | objet_code | Objet du code | AN | 10 | E | inscription, invité, PIN oublié, changement de numéro |
| 146 | empreinte_code | Empreinte du code | AN | 100 | E | Jamais en clair (RG06) |
| 147 | nb_essais_code | Nombre d'essais | N | 1 | E | 5 maximum |
| 148 | date_creation_code | Date de création | DH | | E | |
| 149 | date_expiration_code | Date d'expiration | DH | | E | + 10 minutes |
| 150 | date_utilisation_code | Date d'utilisation | DH | | E | |
| | **Paramètre** | | | | | |
| 151 | cle_param | Nom du paramètre | AN | 20 | S | Ex. « app » |
| 152 | valeur_param | Valeur (tarifs, majorations, abonnements…) | AN | 4000 | E | Format JSON |
| 153 | date_maj_param | Date de mise à jour | DH | | E | |

#### 4.2.3 Données calculées non mémorisées

Ces informations sont **affichées** par l'application mais **recalculées** à chaque fois à partir des données mémorisées.

| Code | Désignation | Règle de calcul |
|---|---|---|
| note_moy_chauffeur | Note moyenne d'un chauffeur | somme_notes_chauf ÷ nb_notes_chauf, arrondie au dixième |
| note_moy_passager | Note moyenne d'un passager | somme_notes_pass ÷ nb_notes_pass |
| abonnement_actif | L'abonnement est-il valable ? | date_fin_abo > date du jour |
| jours_restants | Jours d'abonnement restants | ⌈(date_fin_abo − maintenant) ÷ 1 jour⌉ |
| duree_estimee | Durée estimée du trajet (min) | max(3 ; distance_km ÷ vitesse moyenne × 60) |
| majoration_en_vigueur | Majoration applicable (%) | majoration nuit (si heure dans la plage) + majoration pluie (si active) |
| gains_periode | Gains d'un chauffeur sur une période | Σ prix_course des courses terminées dans la période |
| temps_en_ligne | Temps en ligne d'un chauffeur | Σ (fin_periode − debut_periode) |
| taux_acceptation | Taux d'acceptation des propositions | propositions acceptées ÷ (acceptées + refusées + expirées) × 100 |
| distance_au_depart | Distance du chauffeur au point de départ | Formule de haversine entre la position du chauffeur et le départ |

### 4.3 Les dépendances fonctionnelles

Une **dépendance fonctionnelle** (DF) A → B signifie que la connaissance d'une valeur de A permet de connaître **une seule** valeur de B.

**Tableau 8 : Dépendances fonctionnelles**

| N° | Source | Cible(s) |
|---|---|---|
| DF1 | id_util | nom_util, tel_util, email_util, empreinte_pin, role_util, date_inscription, est_bloque, est_principal, role_admin, est_invite, tel_invite, nom_contact_urg, tel_contact_urg, somme_notes_pass, nb_notes_pass, code_parrainage, date_suppression |
| DF2 | tel_util | id_util *(identifiant alternatif)* |
| DF3 | code_parrainage | id_util *(identifiant alternatif)* |
| DF4 | id_util *(d'un chauffeur)* | immatriculation, modele_moto, num_permis, statut_chauffeur, est_en_ligne, lat_chauffeur, lng_chauffeur, date_position, somme_notes_chauf, nb_notes_chauf, date_fin_abo, recompense_versee, date_rappel_j3, date_rappel_j1, **id_util du parrain** |
| DF5 | id_course | statut_course, lib_depart, lat_depart, lng_depart, lib_arrivee, lat_arrivee, lng_arrivee, distance_km, prix_course, mode_paiement, date_demande, date_reservation, date_acceptation, date_arrivee_chauf, date_debut, date_fin, date_annulation, annule_par, note_chauffeur, commentaire_passager, note_passager, commentaire_chauffeur, avis_masque, nom_beneficiaire, tel_beneficiaire, jeton_partage, date_fin_offre, ouverte_a_tous, source_itineraire, **id_util du passager**, **id_util du chauffeur assigné**, **id_util du chauffeur sollicité** |
| DF6 | jeton_partage | id_course *(identifiant alternatif)* |
| DF7 | id_course, id_util *(chauffeur)* | date_proposition, reponse_proposition |
| DF8 | id_abo | formule, montant_abo, statut_abo, date_demande_abo, date_paiement, date_debut_abo, date_fin_periode, **id_util du chauffeur** |
| DF9 | id_doc | type_doc, fichier_doc, type_mime, date_expiration_doc, date_rappel_doc, date_envoi_doc, **id_util du chauffeur** |
| DF10 | id_util *(chauffeur)*, type_doc | id_doc *(un seul document par type, RG12)* |
| DF11 | jeton_session | date_expiration_session, **id_util** |
| DF12 | id_favori | type_favori, lib_favori, lat_favori, lng_favori, date_ajout_favori, **id_util** |
| DF13 | id_alerte | lat_alerte, lng_alerte, date_alerte, date_traitement_alerte, traitee_par, note_traitement, **id_util**, **id_course** |
| DF14 | id_reclam | categorie_reclam, message_reclam, statut_reclam, reponse_admin, date_reclam, date_resolution, **id_util**, **id_course** |
| DF15 | id_notif | titre_notif, contenu_notif, lien_notif, date_notif, date_lecture, **id_util** |
| DF16 | id_periode | debut_periode, fin_periode, **id_util du chauffeur** |
| DF17 | id_push | adresse_push, cles_push, date_abonnement_push, **id_util** |
| DF18 | adresse_push | id_push *(identifiant alternatif)* |
| DF19 | id_action | nom_admin_action, libelle_action, cible_action, details_action, adresse_ip, date_action, **id_util de l'administrateur** |
| DF20 | id_message | nom_expediteur, contact_expediteur, sujet_message, contenu_message, date_message, message_traite |
| DF21 | id_lieu | lib_lieu, lat_lieu, lng_lieu, lieu_actif, ordre_lieu |
| DF22 | id_diffusion | public_cible, titre_diffusion, contenu_diffusion, avec_sms, nb_destinataires, nom_admin_diffusion, date_diffusion |
| DF23 | id_code | tel_code, objet_code, empreinte_code, nb_essais_code, date_creation_code, date_expiration_code, date_utilisation_code |
| DF24 | cle_param | valeur_param, date_maj_param |

Toutes ces dépendances sont **élémentaires** (aucune partie d'une source composée ne suffit à déterminer la cible) et **directes** (pas de dépendance transitive entre attributs non clés). Les relations qui en découlent sont donc en **troisième forme normale (3FN)**.

### 4.4 Le graphe des dépendances fonctionnelles (GDF)

Le GDF représente les dépendances fonctionnelles sous forme de graphe : chaque identifiant (en encadré) pointe vers les données qu'il détermine, et vers les identifiants auxquels il est rattaché (les flèches entre identifiants donneront les associations du MCD).

**Figure 5 : Graphe des dépendances fonctionnelles**

```
                                   ┌──────────────┐
                    tel_util ────► │              │ ◄──── code_parrainage
                                   │   id_util    │ ───► nom_util, email_util, empreinte_pin, role_util,
                                   │              │      date_inscription, est_bloque, est_principal,
                                   └──────┬───────┘      role_admin, est_invite, tel_invite,
                                          ▲              nom_contact_urg, tel_contact_urg,
         ┌───────────────┬────────────────┼───────────┬──── somme_notes_pass, nb_notes_pass, date_suppression
         │               │                │           │
 ┌───────┴──────┐ ┌──────┴───────┐ ┌──────┴──────┐ ┌──┴───────────┐ ┌──────────────┐ ┌──────────────┐
 │jeton_session │ │  id_favori   │ │  id_notif   │ │   id_push    │ │  id_alerte   │ │  id_reclam   │
 └──────────────┘ └──────────────┘ └─────────────┘ └──────────────┘ └──────┬───────┘ └──────┬───────┘
  date_expiration  type, lib, lat,  titre, contenu,  adresse_push◄─,         │  ▲              │  ▲
                   lng, date        lien, dates      clés, date         (id_util) (id_course) …idem
                                                                             │
 ┌──────────────────────────────────────────────────┐                        ▼
 │  id_util (CHAUFFEUR) ─── id_util du parrain ─┐    │              ┌──────────────────┐
 │  immatriculation, modele_moto, num_permis,   │    │ ◄──────────  │    id_course     │ ◄── jeton_partage
 │  statut_chauffeur, est_en_ligne, position,   │    │  chauffeur   │                  │
 │  notes, date_fin_abo, rappels, récompense    ▼    │  assigné et  └────────┬─────────┘
 └──────────────▲────────────▲───────────▲──────────┘  sollicité            │
                │            │           │                                  ├──► statut, départ, arrivée,
        ┌───────┴─────┐ ┌────┴──────┐ ┌──┴─────────┐                        │    distance, prix, dates,
        │   id_abo    │ │  id_doc   │ │ id_periode │                        │    notes, bénéficiaire,
        └─────────────┘ └───────────┘ └────────────┘                        │    offre, source…
         formule,        type, fichier,  début, fin                         └──► id_util du passager
         montant,        mime, expiration
         statut, dates   (id_util, type_doc) ──► id_doc

 ┌─────────────────────────────┐
 │ (id_course, id_util chauf.) │ ───► date_proposition, reponse_proposition      (DF composée)
 └─────────────────────────────┘

 Identifiants isolés :  id_action ──► … , id_util admin   │  id_message ──► …   │  id_lieu ──► …
                        id_diffusion ──► …                │  id_code ──► …      │  cle_param ──► …
```

### 4.5 Le Modèle Conceptuel des Données (MCD)

Le MCD représente les données du système sous forme d'**entités** (objets de gestion), d'**associations** (liens entre entités) et de **cardinalités** (nombre minimum et maximum de participations). Il est obtenu à partir du GDF : chaque identifiant source devient une entité, chaque DF entre identifiants devient une association, et chaque DF composée devient une association porteuse de données.

#### 4.5.1 Les entités

**Tableau 9 : Entités du MCD**

| Entité | Identifiant | Propriétés |
|---|---|---|
| UTILISATEUR | id_util | nom_util, tel_util, email_util, empreinte_pin, role_util, date_inscription, est_bloque, est_principal, role_admin, est_invite, tel_invite, nom_contact_urg, tel_contact_urg, somme_notes_pass, nb_notes_pass, code_parrainage, date_suppression |
| CHAUFFEUR | *(id_util, hérité par l'association ÊTRE)* | immatriculation, modele_moto, num_permis, statut_chauffeur, est_en_ligne, lat_chauffeur, lng_chauffeur, date_position, somme_notes_chauf, nb_notes_chauf, date_fin_abo, recompense_versee, date_rappel_j3, date_rappel_j1 |
| COURSE | id_course | statut_course, lib_depart, lat_depart, lng_depart, lib_arrivee, lat_arrivee, lng_arrivee, distance_km, prix_course, mode_paiement, date_demande, date_reservation, date_acceptation, date_arrivee_chauf, date_debut, date_fin, date_annulation, annule_par, note_chauffeur, commentaire_passager, note_passager, commentaire_chauffeur, avis_masque, nom_beneficiaire, tel_beneficiaire, jeton_partage, date_fin_offre, ouverte_a_tous, source_itineraire |
| ABONNEMENT | id_abo | formule, montant_abo, statut_abo, date_demande_abo, date_paiement, date_debut_abo, date_fin_periode |
| DOCUMENT | id_doc | type_doc, fichier_doc, type_mime, date_expiration_doc, date_rappel_doc, date_envoi_doc |
| SESSION | jeton_session | date_expiration_session |
| LIEU_FAVORI | id_favori | type_favori, lib_favori, lat_favori, lng_favori, date_ajout_favori |
| ALERTE | id_alerte | lat_alerte, lng_alerte, date_alerte, date_traitement_alerte, traitee_par, note_traitement |
| RECLAMATION | id_reclam | categorie_reclam, message_reclam, statut_reclam, reponse_admin, date_reclam, date_resolution |
| NOTIFICATION | id_notif | titre_notif, contenu_notif, lien_notif, date_notif, date_lecture |
| PERIODE_EN_LIGNE | id_periode | debut_periode, fin_periode |
| ABONNEMENT_PUSH | id_push | adresse_push, cles_push, date_abonnement_push |
| JOURNAL_ACTION | id_action | nom_admin_action, libelle_action, cible_action, details_action, adresse_ip, date_action |
| MESSAGE_CONTACT | id_message | nom_expediteur, contact_expediteur, sujet_message, contenu_message, date_message, message_traite |
| LIEU_FREQUENT | id_lieu | lib_lieu, lat_lieu, lng_lieu, lieu_actif, ordre_lieu |
| DIFFUSION | id_diffusion | public_cible, titre_diffusion, contenu_diffusion, avec_sms, nb_destinataires, nom_admin_diffusion, date_diffusion |
| CODE_VERIFICATION | id_code | tel_code, objet_code, empreinte_code, nb_essais_code, date_creation_code, date_expiration_code, date_utilisation_code |
| PARAMETRE | cle_param | valeur_param, date_maj_param |

#### 4.5.2 Les associations et leurs cardinalités

**Tableau 10 : Associations et cardinalités du MCD**

| Association | Entité 1 (card.) | Entité 2 (card.) | Propriétés portées | Justification (règles de gestion) |
|---|---|---|---|---|
| **ÊTRE** | UTILISATEUR (0,1) | CHAUFFEUR (1,1) | — | Un utilisateur est au plus un chauffeur ; un chauffeur est exactement un utilisateur (RG10) |
| **OUVRIR** | UTILISATEUR (0,n) | SESSION (1,1) | — | Plusieurs sessions possibles par utilisateur (RG04) |
| **COMMANDER** | UTILISATEUR (0,n) | COURSE (1,1) | — | Une course a un seul passager (RG22) |
| **ASSURER** | CHAUFFEUR (0,n) | COURSE (0,1) | — | Une course est réalisée par au plus un chauffeur (RG22) |
| **SOLLICITER** | CHAUFFEUR (0,n) | COURSE (0,1) | — | À un instant donné, une course est proposée à au plus un chauffeur (RG31) |
| **PROPOSER** | CHAUFFEUR (0,n) | COURSE (0,n) | date_proposition, reponse_proposition | Historique des propositions et réponses (RG31, RG32) |
| **SOUSCRIRE** | CHAUFFEUR (0,n) | ABONNEMENT (1,1) | — | Un abonnement concerne un seul chauffeur (RG17-RG19) |
| **PARRAINER** *(réflexive)* | CHAUFFEUR « parrain » (0,n) | CHAUFFEUR « filleul » (0,1) | — | RG16 |
| **FOURNIR** | CHAUFFEUR (0,n) | DOCUMENT (1,1) | — | Un document appartient à un seul chauffeur (RG12) |
| **ÊTRE_EN_LIGNE** | CHAUFFEUR (0,n) | PERIODE_EN_LIGNE (1,1) | — | Historique des périodes en ligne |
| **ENREGISTRER** | UTILISATEUR (0,n) | LIEU_FAVORI (1,1) | — | RG40 |
| **DÉCLENCHER** | UTILISATEUR (0,n) | ALERTE (1,1) | — | RG38 |
| **CONCERNER** | COURSE (0,n) | ALERTE (0,1) | — | Une alerte peut être hors course |
| **DÉPOSER** | UTILISATEUR (0,n) | RECLAMATION (1,1) | — | RG39 |
| **PORTER_SUR** | COURSE (0,n) | RECLAMATION (0,1) | — | Une réclamation peut ne viser aucune course |
| **RECEVOIR** | UTILISATEUR (0,n) | NOTIFICATION (1,1) | — | |
| **S_ABONNER** | UTILISATEUR (0,n) | ABONNEMENT_PUSH (1,1) | — | Un abonnement push par appareil |
| **EFFECTUER** | UTILISATEUR (0,n) | JOURNAL_ACTION (0,1) | — | (0,1) : la trace reste si l'administrateur est supprimé (RG44) |

Les entités MESSAGE_CONTACT, LIEU_FREQUENT, DIFFUSION, CODE_VERIFICATION et PARAMETRE ne sont liées à aucune autre : elles décrivent des objets indépendants (message d'un visiteur anonyme, lieu de la ville, réglage…).

**Contraintes d'intégrité complémentaires**

- **CI1** — Un UTILISATEUR participe à ÊTRE seulement si son rôle est « chauffeur ».
- **CI2** — Dans COMMANDER, l'utilisateur a le rôle « passager ».
- **CI3** — Un chauffeur ne peut pas se parrainer lui-même.
- **CI4** — Un chauffeur ne possède qu'un DOCUMENT par type (DF10).
- **CI5** — Un seul UTILISATEUR a est_principal = oui (RG43).

#### 4.5.3 Le schéma du MCD

**Figure 6 : Modèle Conceptuel des Données de SURPLACE** *(à redessiner avec Looping)*

```
 ┌─────────────────┐ 1,1      ┌───────────┐       0,n ┌──────────────────────┐ 0,n      ┌───────────┐ 1,1 ┌─────────────┐
 │    SESSION      ├──────────┤  OUVRIR   ├───────────┤     UTILISATEUR      ├──────────┤ RECEVOIR  ├─────┤NOTIFICATION │
 │ jeton_session   │          └───────────┘           │ id_util              │          └───────────┘     │ id_notif    │
 │ date_expiration │                                  │ nom_util, tel_util   │                            │ titre, ...  │
 └─────────────────┘ 1,1   ┌───────────────┐     0,n  │ email_util           │ 0,n  ┌────────────┐ 1,1    └─────────────┘
 ┌─────────────────┐───────┤  S_ABONNER    ├──────────┤ empreinte_pin        ├──────┤ ENREGISTRER├────┐
 │ ABONNEMENT_PUSH │       └───────────────┘          │ role_util, role_admin│      └────────────┘    │ ┌─────────────┐
 │ id_push ...     │                                  │ est_invite, ...      │                        └─┤ LIEU_FAVORI │
 └─────────────────┘ 0,1   ┌───────────────┐     0,n  │ contact d'urgence    │                          │ id_favori...│
 ┌─────────────────┐───────┤  EFFECTUER    ├──────────┤ notes passager       │                          └─────────────┘
 │ JOURNAL_ACTION  │       └───────────────┘          │ code_parrainage      │
 │ id_action ...   │                                  └───┬──────┬──────┬────┘
 └─────────────────┘                                 0,1  │  0,n │  0,n │ 0,n
                                                   ┌──────┴┐ ┌───┴────┐ ┌┴──────────┐
                                                   │ ÊTRE  │ │DÉPOSER │ │ DÉCLENCHER│
                                                   └──┬────┘ └───┬────┘ └────┬──────┘
                                                  1,1 │       1,1│       1,1 │
 ┌─────────────────────────┐                ┌─────────┴────────┐ │  ┌────────┴──────┐
 │      PARRAINER          │ 0,n  parrain   │    CHAUFFEUR     │ │  │    ALERTE     │
 │      (réflexive)        ├────────────────┤ immatriculation  │ │  │ id_alerte ... │
 │                         ├────────────────┤ modele_moto      │ │  └────────┬──────┘
 └─────────────────────────┘ 0,1  filleul   │ num_permis       │ │       0,1 │
                                            │ statut_chauffeur │ │      ┌────┴──────┐
 ┌──────────────┐ 1,1 ┌──────────┐    0,n   │ est_en_ligne     │ │      │ CONCERNER │
 │  ABONNEMENT  ├─────┤SOUSCRIRE ├──────────┤ position, notes  │ │      └────┬──────┘
 │  id_abo ...  │     └──────────┘          │ date_fin_abo ... │ │       0,n │
 └──────────────┘                           └─┬───┬────┬────┬──┘ │           │
 ┌──────────────┐ 1,1 ┌──────────┐   0,n      │   │    │    │    │ ┌─────────┴─────────────┐
 │   DOCUMENT   ├─────┤ FOURNIR  ├────────────┘   │    │    │    │ │        COURSE         │
 │  id_doc ...  │     └──────────┘                │    │    │    │ │ id_course             │
 └──────────────┘                             0,n │    │0,n │0,n │ │ statut, départ,       │
 ┌──────────────────┐ 1,1 ┌──────────────┐        │    │    │    │ │ arrivée, distance,    │
 │ PERIODE_EN_LIGNE ├─────┤ ÊTRE_EN_LIGNE├────────┘    │    │    │ │ prix, dates, notes,   │
 │ id_periode ...   │     └──────────────┘             │    │    │ │ bénéficiaire, offre…  │
 └──────────────────┘                     ┌────────────┴┐ ┌─┴────┴───────┐  └──┬───┬───┬───┬──┘
                                          │  ASSURER    │ │  PROPOSER    │     │   │   │   │
                                          │             │ │ date_propos. │     │   │   │   │
                                          └─────┬───────┘ │ reponse      │     │   │   │   │
                                            0,1 │         └─────┬────────┘     │   │   │   │
                                                └───────────────┼──────────────┘   │   │   │
                                                            0,n └──────────────────┘   │   │
                                          ┌─────────────┐  0,1                         │   │
                                          │ SOLLICITER  ├──────────────────────────────┘   │
                                          │(chauffeur   │  0,n ── vers CHAUFFEUR           │
                                          │ en cours)   │                                  │
                                          └─────────────┘                                  │
                          ┌────────────┐ 0,n (COURSE) ──────────── COMMANDER (1,1) ────────┘── UTILISATEUR (0,n)
                          │ PORTER_SUR │ 0,n (COURSE) ── 0,1 (RECLAMATION) ── DÉPOSER ── UTILISATEUR
                          └────────────┘

 Entités indépendantes :  MESSAGE_CONTACT   LIEU_FREQUENT   DIFFUSION   CODE_VERIFICATION   PARAMETRE
```

Le schéma ci-dessus étant dense, voici sa **lecture association par association**, telle qu'elle doit être reproduite dans Looping :

```
UTILISATEUR (0,1) ──── ÊTRE ──── (1,1) CHAUFFEUR
UTILISATEUR (0,n) ──── OUVRIR ──── (1,1) SESSION
UTILISATEUR (0,n) ──── COMMANDER ──── (1,1) COURSE
CHAUFFEUR   (0,n) ──── ASSURER ──── (0,1) COURSE
CHAUFFEUR   (0,n) ──── SOLLICITER ──── (0,1) COURSE
CHAUFFEUR   (0,n) ──── PROPOSER [date_proposition, reponse_proposition] ──── (0,n) COURSE
CHAUFFEUR   (0,n) ──── SOUSCRIRE ──── (1,1) ABONNEMENT
CHAUFFEUR   (0,n) ──── PARRAINER ──── (0,1) CHAUFFEUR
CHAUFFEUR   (0,n) ──── FOURNIR ──── (1,1) DOCUMENT
CHAUFFEUR   (0,n) ──── ÊTRE_EN_LIGNE ──── (1,1) PERIODE_EN_LIGNE
UTILISATEUR (0,n) ──── ENREGISTRER ──── (1,1) LIEU_FAVORI
UTILISATEUR (0,n) ──── DÉCLENCHER ──── (1,1) ALERTE
COURSE      (0,n) ──── CONCERNER ──── (0,1) ALERTE
UTILISATEUR (0,n) ──── DÉPOSER ──── (1,1) RECLAMATION
COURSE      (0,n) ──── PORTER_SUR ──── (0,1) RECLAMATION
UTILISATEUR (0,n) ──── RECEVOIR ──── (1,1) NOTIFICATION
UTILISATEUR (0,n) ──── S_ABONNER ──── (1,1) ABONNEMENT_PUSH
UTILISATEUR (0,n) ──── EFFECTUER ──── (0,1) JOURNAL_ACTION
```

### 4.6 Le Modèle Logique des Données Relationnel (MLD-R)

#### 4.6.1 Règles de passage du MCD au MLD-R

| Règle | Application |
|---|---|
| **R1** — Chaque entité devient une **relation** ; son identifiant devient la **clé primaire**. | UTILISATEUR, COURSE, ABONNEMENT… |
| **R2** — Association de type **(x,1) – (x,n)** : l'identifiant de l'entité côté (x,n) migre comme **clé étrangère** dans la relation côté (x,1). | COMMANDER : id_util du passager migre dans COURSE |
| **R3** — Association **(0,1) – (1,1)** : la clé de l'entité côté (0,1) migre dans la relation côté (1,1) ; si elle en est l'identifiant, elle devient **clé primaire et étrangère**. | ÊTRE : CHAUFFEUR est identifié par #id_util |
| **R4** — Association **(x,n) – (x,n)** (ou porteuse de données) : elle devient une **relation** dont la clé est la concaténation des identifiants ; ses propriétés deviennent des attributs. | PROPOSER(#id_course, #id_chauffeur, …) |
| **R5** — Association **réflexive** (0,n) – (0,1) : la clé migre une seconde fois, sous un rôle. | PARRAINER : #id_parrain dans CHAUFFEUR |

**Notation** : la clé primaire est **soulignée** (ici en **gras**), les clés étrangères sont précédées de **#**.

#### 4.6.2 Schéma relationnel

- **UTILISATEUR** (**id_util**, nom_util, tel_util, email_util, empreinte_pin, role_util, date_inscription, est_bloque, est_principal, role_admin, est_invite, tel_invite, nom_contact_urg, tel_contact_urg, somme_notes_pass, nb_notes_pass, code_parrainage, date_suppression)
- **CHAUFFEUR** (**#id_util**, immatriculation, modele_moto, num_permis, statut_chauffeur, est_en_ligne, lat_chauffeur, lng_chauffeur, date_position, somme_notes_chauf, nb_notes_chauf, date_fin_abo, recompense_versee, date_rappel_j3, date_rappel_j1, #id_parrain)
- **COURSE** (**id_course**, statut_course, lib_depart, lat_depart, lng_depart, lib_arrivee, lat_arrivee, lng_arrivee, distance_km, prix_course, mode_paiement, date_demande, date_reservation, date_acceptation, date_arrivee_chauf, date_debut, date_fin, date_annulation, annule_par, note_chauffeur, commentaire_passager, note_passager, commentaire_chauffeur, avis_masque, nom_beneficiaire, tel_beneficiaire, jeton_partage, date_fin_offre, ouverte_a_tous, source_itineraire, #id_passager, #id_chauffeur, #id_chauffeur_sollicite)
- **PROPOSER** (**#id_course, #id_chauffeur**, date_proposition, reponse_proposition)
- **ABONNEMENT** (**id_abo**, formule, montant_abo, statut_abo, date_demande_abo, date_paiement, date_debut_abo, date_fin_periode, #id_chauffeur)
- **DOCUMENT** (**id_doc**, type_doc, fichier_doc, type_mime, date_expiration_doc, date_rappel_doc, date_envoi_doc, #id_chauffeur)
- **SESSION** (**jeton_session**, date_expiration_session, #id_util)
- **LIEU_FAVORI** (**id_favori**, type_favori, lib_favori, lat_favori, lng_favori, date_ajout_favori, #id_util)
- **ALERTE** (**id_alerte**, lat_alerte, lng_alerte, date_alerte, date_traitement_alerte, traitee_par, note_traitement, #id_util, #id_course)
- **RECLAMATION** (**id_reclam**, categorie_reclam, message_reclam, statut_reclam, reponse_admin, date_reclam, date_resolution, #id_util, #id_course)
- **NOTIFICATION** (**id_notif**, titre_notif, contenu_notif, lien_notif, date_notif, date_lecture, #id_util)
- **PERIODE_EN_LIGNE** (**id_periode**, debut_periode, fin_periode, #id_chauffeur)
- **ABONNEMENT_PUSH** (**id_push**, adresse_push, cles_push, date_abonnement_push, #id_util)
- **JOURNAL_ACTION** (**id_action**, nom_admin_action, libelle_action, cible_action, details_action, adresse_ip, date_action, #id_admin)
- **MESSAGE_CONTACT** (**id_message**, nom_expediteur, contact_expediteur, sujet_message, contenu_message, date_message, message_traite)
- **LIEU_FREQUENT** (**id_lieu**, lib_lieu, lat_lieu, lng_lieu, lieu_actif, ordre_lieu)
- **DIFFUSION** (**id_diffusion**, public_cible, titre_diffusion, contenu_diffusion, avec_sms, nb_destinataires, nom_admin_diffusion, date_diffusion)
- **CODE_VERIFICATION** (**id_code**, tel_code, objet_code, empreinte_code, nb_essais_code, date_creation_code, date_expiration_code, date_utilisation_code)
- **PARAMETRE** (**cle_param**, valeur_param, date_maj_param)

**Précisions sur les clés étrangères**

| Clé étrangère | Dans | Référence | Issue de |
|---|---|---|---|
| #id_util | CHAUFFEUR | UTILISATEUR(id_util) | ÊTRE (R3) — aussi clé primaire |
| #id_parrain | CHAUFFEUR | CHAUFFEUR(id_util) | PARRAINER (R5) |
| #id_passager | COURSE | UTILISATEUR(id_util) | COMMANDER (R2) |
| #id_chauffeur | COURSE | CHAUFFEUR(id_util) | ASSURER (R2) |
| #id_chauffeur_sollicite | COURSE | CHAUFFEUR(id_util) | SOLLICITER (R2) |
| #id_course, #id_chauffeur | PROPOSER | COURSE, CHAUFFEUR | PROPOSER (R4) |
| #id_chauffeur | ABONNEMENT, DOCUMENT, PERIODE_EN_LIGNE | CHAUFFEUR(id_util) | SOUSCRIRE, FOURNIR, ÊTRE_EN_LIGNE (R2) |
| #id_util | SESSION, LIEU_FAVORI, ALERTE, RECLAMATION, NOTIFICATION, ABONNEMENT_PUSH | UTILISATEUR(id_util) | (R2) |
| #id_course | ALERTE, RECLAMATION | COURSE(id_course) | CONCERNER, PORTER_SUR (R2) |
| #id_admin | JOURNAL_ACTION | UTILISATEUR(id_util) | EFFECTUER (R2) |

### 4.7 Le Modèle Physique des Données (MPD)

#### 4.7.1 Choix du SGBD

Nous avons retenu **SQLite**, un SGBD relationnel qui enregistre toute la base dans un **seul fichier**, sans serveur de base de données à installer ni à administrer. Il est fiable, rapide et largement suffisant pour l'activité d'une ville comme Korhogo (plusieurs milliers de courses par jour). La base est accédée depuis l'API par la bibliothèque `better-sqlite3`, en mode **WAL** (lectures possibles pendant les écritures) avec les **clés étrangères activées**.

Dans le programme, les noms des tables et des colonnes sont écrits en anglais (convention du code source). Le tableau suivant établit la correspondance.

**Tableau 11 : Correspondance MLD-R / tables physiques**

| Relation (MLD-R) | Table physique | Exemples de correspondance de colonnes |
|---|---|---|
| UTILISATEUR | `users` | id_util → `id`, nom_util → `name`, tel_util → `phone`, empreinte_pin → `pin_hash`, role_util → `role`, est_invite → `guest`, tel_invite → `guest_phone` |
| CHAUFFEUR | `drivers` | id_util → `user_id`, immatriculation → `plate`, num_permis → `license_number`, statut_chauffeur → `status`, date_fin_abo → `subscription_until`, id_parrain → `referred_by` |
| COURSE | `rides` | id_passager → `passenger_id`, id_chauffeur → `driver_id`, id_chauffeur_sollicite → `offer_driver_id`, prix_course → `price`, date_reservation → `scheduled_at`, jeton_partage → `share_token` |
| PROPOSER | `ride_offers` | date_proposition → `offered_at`, reponse_proposition → `response` |
| ABONNEMENT | `subscriptions` | formule → `plan`, montant_abo → `amount`, date_fin_periode → `ends_at` |
| DOCUMENT | `driver_documents` | type_doc → `type`, fichier_doc → `file`, date_expiration_doc → `expires_at` |
| SESSION | `sessions` | jeton_session → `token` |
| LIEU_FAVORI | `saved_places` | type_favori → `kind` |
| ALERTE | `emergency_alerts` | traitee_par → `handled_by` |
| RECLAMATION | `complaints` | categorie_reclam → `category`, reponse_admin → `admin_note` |
| NOTIFICATION | `notifications` | date_lecture → `read_at` |
| PERIODE_EN_LIGNE | `driver_online_log` | debut_periode → `started_at` |
| ABONNEMENT_PUSH | `push_subscriptions` | adresse_push → `endpoint` |
| JOURNAL_ACTION | `audit_log` | libelle_action → `action`, cible_action → `target` |
| MESSAGE_CONTACT | `contact_messages` | message_traite → `handled` |
| LIEU_FREQUENT | `places` | ordre_lieu → `sort` |
| DIFFUSION | `broadcasts` | public_cible → `audience` |
| CODE_VERIFICATION | `otp_codes` | objet_code → `purpose`, empreinte_code → `code_hash` |
| PARAMETRE | `settings` | cle_param → `key`, valeur_param → `value` |

#### 4.7.2 Script de création de la base (SQL)

Les types SQLite utilisés sont : `INTEGER` (entiers, booléens 0/1), `REAL` (décimaux), `TEXT` (textes et dates au format ISO 8601, ex. `2026-10-15T14:32:10.123Z`).

```sql
PRAGMA foreign_keys = ON;

-- UTILISATEUR
CREATE TABLE users (
  id                      INTEGER PRIMARY KEY AUTOINCREMENT,
  role                    TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'admin')),
  name                    TEXT NOT NULL,
  phone                   TEXT NOT NULL UNIQUE,
  email                   TEXT,
  pin_hash                TEXT NOT NULL,
  created_at              TEXT NOT NULL,
  blocked                 INTEGER NOT NULL DEFAULT 0,
  is_principal            INTEGER NOT NULL DEFAULT 0,
  admin_role              TEXT NOT NULL DEFAULT 'full',
  guest                   INTEGER NOT NULL DEFAULT 0,
  guest_phone             TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  rating_sum              INTEGER NOT NULL DEFAULT 0,
  rating_count            INTEGER NOT NULL DEFAULT 0,
  referral_code           TEXT UNIQUE,
  deleted_at              TEXT
);

-- CHAUFFEUR (clé primaire = clé étrangère vers users : association ÊTRE)
CREATE TABLE drivers (
  user_id            INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  plate              TEXT NOT NULL,
  moto_model         TEXT NOT NULL,
  license_number     TEXT,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  is_online          INTEGER NOT NULL DEFAULT 0,
  lat                REAL,
  lng                REAL,
  location_at        TEXT,
  rating_sum         INTEGER NOT NULL DEFAULT 0,
  rating_count       INTEGER NOT NULL DEFAULT 0,
  subscription_until TEXT,
  referred_by        INTEGER,                    -- parrain (association réflexive PARRAINER)
  referral_rewarded  INTEGER NOT NULL DEFAULT 0,
  reminder3_for      TEXT,
  reminder1_for      TEXT
);

-- SESSION
CREATE TABLE sessions (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL
);

-- COURSE
CREATE TABLE rides (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  passenger_id      INTEGER NOT NULL REFERENCES users(id),
  driver_id         INTEGER REFERENCES users(id),
  status            TEXT NOT NULL CHECK (status IN ('requested', 'accepted', 'arrived', 'in_progress', 'completed', 'cancelled')),
  pickup_label      TEXT NOT NULL,
  pickup_lat        REAL NOT NULL,
  pickup_lng        REAL NOT NULL,
  dropoff_label     TEXT NOT NULL,
  dropoff_lat       REAL NOT NULL,
  dropoff_lng       REAL NOT NULL,
  distance_km       REAL NOT NULL,
  price             INTEGER NOT NULL,
  payment_method    TEXT NOT NULL DEFAULT 'cash',
  requested_at      TEXT NOT NULL,
  scheduled_at      TEXT,
  accepted_at       TEXT,
  arrived_at        TEXT,
  started_at        TEXT,
  completed_at      TEXT,
  cancelled_at      TEXT,
  cancelled_by      TEXT,
  rating            INTEGER,
  comment           TEXT,
  passenger_rating  INTEGER,
  passenger_comment TEXT,
  review_hidden     INTEGER NOT NULL DEFAULT 0,
  rider_name        TEXT,
  rider_phone       TEXT,
  share_token       TEXT UNIQUE,
  offer_driver_id   INTEGER,
  offer_expires_at  TEXT,
  dispatch_open     INTEGER NOT NULL DEFAULT 0,
  route_source      TEXT
);
CREATE INDEX rides_status_idx    ON rides(status);
CREATE INDEX rides_passenger_idx ON rides(passenger_id);
CREATE INDEX rides_driver_idx    ON rides(driver_id);

-- PROPOSER (association porteuse : clé composée)
CREATE TABLE ride_offers (
  ride_id     INTEGER NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  driver_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  offered_at  TEXT NOT NULL,
  response    TEXT NOT NULL DEFAULT 'pending'
              CHECK (response IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
  PRIMARY KEY (ride_id, driver_id)
);

-- ABONNEMENT
CREATE TABLE subscriptions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan          TEXT NOT NULL CHECK (plan IN ('monthly', 'yearly')),
  amount        INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'rejected', 'cancelled')),
  requested_at  TEXT NOT NULL,
  paid_at       TEXT,
  starts_at     TEXT,
  ends_at       TEXT
);

-- DOCUMENT (un seul document par type et par chauffeur)
CREATE TABLE driver_documents (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('photo', 'license', 'registration', 'id_card', 'insurance')),
  file         TEXT NOT NULL,
  mime         TEXT NOT NULL,
  expires_at   TEXT,
  reminder_for TEXT,
  uploaded_at  TEXT NOT NULL
);
CREATE UNIQUE INDEX driver_documents_type_idx ON driver_documents(driver_id, type);

-- LIEU_FAVORI
CREATE TABLE saved_places (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('home', 'work', 'other')),
  label       TEXT NOT NULL,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  created_at  TEXT NOT NULL
);

-- ALERTE
CREATE TABLE emergency_alerts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ride_id     INTEGER REFERENCES rides(id) ON DELETE SET NULL,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat         REAL,
  lng         REAL,
  created_at  TEXT NOT NULL,
  handled_at  TEXT,
  handled_by  TEXT,
  note        TEXT
);

-- RECLAMATION
CREATE TABLE complaints (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  ride_id     INTEGER REFERENCES rides(id) ON DELETE SET NULL,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category    TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  admin_note  TEXT,
  created_at  TEXT NOT NULL,
  resolved_at TEXT
);

-- NOTIFICATION
CREATE TABLE notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  url         TEXT,
  created_at  TEXT NOT NULL,
  read_at     TEXT
);
CREATE INDEX notifications_user_idx ON notifications(user_id, read_at);

-- PERIODE_EN_LIGNE
CREATE TABLE driver_online_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  driver_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at  TEXT NOT NULL,
  ended_at    TEXT
);

-- ABONNEMENT_PUSH
CREATE TABLE push_subscriptions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint    TEXT NOT NULL UNIQUE,
  keys        TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

-- JOURNAL_ACTION
CREATE TABLE audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id    INTEGER,
  admin_name  TEXT NOT NULL,
  action      TEXT NOT NULL,
  target      TEXT,
  details     TEXT,
  ip          TEXT,
  created_at  TEXT NOT NULL
);

-- MESSAGE_CONTACT
CREATE TABLE contact_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  handled     INTEGER NOT NULL DEFAULT 0
);

-- LIEU_FREQUENT
CREATE TABLE places (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  label   TEXT NOT NULL,
  lat     REAL NOT NULL,
  lng     REAL NOT NULL,
  active  INTEGER NOT NULL DEFAULT 1,
  sort    INTEGER NOT NULL DEFAULT 0
);

-- DIFFUSION
CREATE TABLE broadcasts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  audience    TEXT NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  sms         INTEGER NOT NULL DEFAULT 0,
  recipients  INTEGER NOT NULL DEFAULT 0,
  admin_name  TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

-- CODE_VERIFICATION
CREATE TABLE otp_codes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  phone       TEXT NOT NULL,
  purpose     TEXT NOT NULL,
  code_hash   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL,
  used_at     TEXT
);
CREATE INDEX otp_codes_phone_idx ON otp_codes(phone, purpose);

-- PARAMETRE
CREATE TABLE settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);
```

#### 4.7.3 Choix d'implémentation

- **Index** : les recherches les plus fréquentes (courses par statut, par passager, par chauffeur ; notifications non lues ; codes SMS par numéro) sont accélérées par des index.
- **Intégrité** : les contraintes `CHECK` limitent les valeurs autorisées (rôles, statuts, formules) ; les clés étrangères avec `ON DELETE CASCADE` suppriment automatiquement les données dépendantes (sessions, documents…) d'un compte supprimé.
- **Données calculées mémorisées** : le prix et la distance d'une course sont figés à la commande (un changement de tarif ne modifie pas les courses passées) ; les cumuls de notes évitent de recalculer la moyenne sur toutes les courses à chaque affichage.
- **Évolution de la base** : à chaque démarrage, l'API vérifie la structure et ajoute automatiquement les colonnes et tables manquantes (« migration »), sans perte de données.
- **Sauvegardes** : une copie de la base est faite chaque jour et conservée 30 jours.
