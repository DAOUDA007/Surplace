## CHAPITRE 5 : ÉTUDE DES TRAITEMENTS

L'étude des traitements décrit **ce que fait** le système en réponse aux événements qu'il reçoit. Elle part des échanges avec l'extérieur (diagramme de contexte et diagramme des flux), décrit les traitements **indépendamment de l'organisation** (MCT), puis précise **qui fait quoi, où et quand** (MOT). Elle se termine par les **schémas d'accès théorique (SAT)**, qui confrontent les traitements au modèle des données.

### 5.1 Le diagramme de contexte

Le diagramme de contexte présente le système SURPLACE comme une boîte noire, avec les acteurs externes qui échangent avec lui.

**Figure 7 : Diagramme de contexte**

```
                                   ┌─────────────────────┐
             demande de course,    │                     │   proposition de course,
             note, réclamation ───►│                     │◄── acceptation, position,
 ┌──────────┐ ◄─── prix, suivi,    │                     │    étapes, note    ┌────────────┐
 │ PASSAGER │      notifications   │                     │──────────────────►│ CHAUFFEUR  │
 └──────────┘                      │                     │  demandes, rappels └────────────┘
                                   │   SYSTÈME           │
 ┌──────────┐ ◄── lien de suivi,   │   SURPLACE          │   décisions (validation, paiement,
 │  PROCHE  │     SMS d'urgence    │                     │◄── tarifs, réponses)  ┌────────────────┐
 └──────────┘                      │                     │───────────────────────►│ ADMINISTRATEUR │
                                   │                     │  alertes, demandes,     └────────────────┘
 ┌───────────────┐ ◄── SMS à envoyer│                     │  rapports, exports
 │ OPÉRATEUR SMS │                  │                     │
 └───────────────┘                  │                     │──► recherche d'adresse ┌──────────────────┐
                                   └─────────────────────┘◄── coordonnées, tracé  │ SERVICE DE CARTE │
                                                                                   └──────────────────┘
```

### 5.2 Le diagramme des flux (Modèle Conceptuel de la Communication)

Le diagramme des flux détaille les échanges entre les **acteurs externes** et les **domaines** (acteurs internes) du système.

**Tableau 12 : Acteurs**

| Type | Acteur | Description |
|---|---|---|
| Externe | Passager | Commande et suit les courses |
| Externe | Chauffeur | Réalise les courses, paie son abonnement |
| Externe | Proche | Suit une course partagée, reçoit les SMS d'urgence |
| Externe | Opérateur SMS | Achemine les SMS (codes, rappels, alertes) |
| Externe | Service de carte | Fournit les adresses, coordonnées et itinéraires (OpenStreetMap) |
| Interne | **Gestion des comptes** | Inscriptions, connexions, codes SMS, profils |
| Interne | **Gestion des courses** | Prix, commande, attribution, suivi, notes, annulations |
| Interne | **Gestion des chauffeurs** | Documents, validation, abonnements, parrainage |
| Interne | **Supervision** | Équipe d'administration : urgences, réclamations, tarifs, rapports, journal |

**Figure 8 : Diagramme des flux**

```
 ┌──────────┐  1,3,5,9,11,13,14   ┌──────────────────────┐   2 (code SMS)    ┌───────────────┐
 │ PASSAGER │────────────────────►│  GESTION DES COMPTES │──────────────────►│ OPÉRATEUR SMS │
 │          │◄──── 4,6,8,10,12 ───│                      │                   └───────┬───────┘
 └────┬─────┘                     └──────────┬───────────┘                           │
      │ 3, 5, 9, 11                           │ 15 (compte chauffeur créé)            │ 2, 22, 25
      ▼                                       ▼                                       ▼
 ┌──────────────────────┐  6 (proposition)  ┌──────────────────────┐          ┌───────────┐
 │ GESTION DES COURSES  │──────────────────►│      CHAUFFEUR       │          │  PROCHE   │
 │                      │◄─ 7 (accept/refus)│                      │          └─────▲─────┘
 │                      │◄─ 8 (position,    │                      │                │ 19 (lien)
 │                      │      étapes)      │                      │                │ 25 (SMS)
 └──┬───────────────┬───┘                   └──┬────────▲──────────┘                │
    │ 23 (zones,    │ 24 (alerte)              │ 16,17  │ 18, 21, 22               │
    │  rapports)    ▼                          ▼        │                          │
    │      ┌──────────────────────┐   ┌──────────────────────┐                     │
    └─────►│     SUPERVISION      │◄──│ GESTION DES CHAUFFEURS│                    │
           │  (administrateurs)   │──►│                      │                     │
           └──────────────────────┘20 └──────────────────────┘                     │
                     └──────────────────────── 25 ─────────────────────────────────┘
```

**Liste des flux**

| N° | Émetteur | Récepteur | Flux |
|---|---|---|---|
| 1 | Passager | Gestion des comptes | Demande d'inscription ou de connexion (numéro, PIN) |
| 2 | Gestion des comptes | Opérateur SMS → Passager / Chauffeur | Code de vérification |
| 3 | Passager | Gestion des courses | Demande d'estimation (départ, destination, heure) |
| 4 | Gestion des courses | Passager | Prix et durée estimés |
| 5 | Passager | Gestion des courses | Commande de course (immédiate ou réservée, pour soi ou un proche) |
| 6 | Gestion des courses | Chauffeur | Proposition de course |
| 7 | Chauffeur | Gestion des courses | Acceptation ou refus |
| 8 | Chauffeur → Gestion des courses → Passager | | Positions et étapes (arrivé, démarré, terminé) |
| 9 | Passager | Gestion des courses | Annulation |
| 10 | Gestion des courses | Passager | Confirmation, informations du chauffeur, notifications |
| 11 | Passager / Chauffeur | Gestion des courses | Note et commentaire |
| 12 | Gestion des courses | Passager | Demande de notation, reçu de course |
| 13 | Passager / Chauffeur | Supervision | Réclamation |
| 14 | Passager | Gestion des courses | Demande de partage de la course |
| 15 | Gestion des comptes | Gestion des chauffeurs | Nouveau chauffeur à valider |
| 16 | Chauffeur | Gestion des chauffeurs | Documents (photo, permis, carte grise, pièce d'identité, assurance) |
| 17 | Chauffeur | Gestion des chauffeurs | Demande d'abonnement ; paiement (en espèces, hors système) |
| 18 | Gestion des chauffeurs | Chauffeur | Validation, suspension, activation d'abonnement |
| 19 | Gestion des courses | Proche | Lien de suivi en direct |
| 20 | Supervision | Gestion des chauffeurs | Décision de validation, confirmation de paiement |
| 21 | Supervision | Chauffeur / Passager | Réponse à une réclamation, message groupé |
| 22 | Gestion des chauffeurs | Chauffeur (notification + SMS) | Rappels d'expiration (abonnement, documents) |
| 23 | Gestion des courses | Supervision | Statistiques, rapports, zones demandées |
| 24 | Passager / Chauffeur → Gestion des courses | Supervision | Alerte d'urgence |
| 25 | Supervision / Système | Proche (SMS) | Message d'urgence avec position et lien de suivi |

### 5.3 Le Modèle Conceptuel des Traitements (MCT)

Le MCT décrit les **opérations** déclenchées par des **événements**, selon une **synchronisation** (conditions de déclenchement), et les **résultats** qu'elles produisent selon des **règles d'émission**. Il ne dit ni qui exécute l'opération, ni où, ni quand.

**Notation utilisée**

```
     (Événement A)         (Événement B)
            \                   /
          ┌──────── ET ─────────┐      ← synchronisation (ET, OU, conditions)
          │  N° — OPÉRATION     │
          │  • action 1         │
          │  • action 2         │
          ├──────────┬──────────┤
          │   OK     │   KO     │      ← règles d'émission
          └────┬─────┴────┬─────┘
               ▼          ▼
          (Résultat 1)  (Résultat 2)
```

#### 5.3.1 MCT du domaine « Gestion des courses »

**Figure 9 : MCT — Gestion des courses**

```
 (E1 Demande d'estimation : départ, destination, heure)
                │
 ┌──────────────┴──────────────┐
 │ OP1 — ESTIMER LE PRIX       │
 │ • vérifier les lieux        │
 │ • calculer la distance      │  (route si disponible, sinon vol d'oiseau × 1,3)
 │ • appliquer le tarif et les │
 │   majorations (nuit, pluie) │
 ├──────────────┬──────────────┤
 │ trajet valide│ trajet invalide
 └──────┬───────┴──────┬───────┘
        ▼              ▼
 (R1 Prix estimé)  (R2 Message d'erreur)

 (E2 Commande du passager)     (E3 Code SMS saisi — si passager invité)
                \                 /
          ┌──────── ET (si invité) ───────┐
          │ OP2 — ENREGISTRER LA COMMANDE │
          │ • vérifier le code SMS (invité)│
          │ • vérifier 0,2 km ≤ distance ≤ 40 km
          │ • vérifier : aucune course en │
          │   cours ou réservée (RG23)    │
          │ • vérifier la réservation     │
          │   (20 min à 7 jours)          │
          │ • calculer et figer le prix   │
          │ • créer le compte invité s'il │
          │   y a lieu                    │
          ├──────────────┬────────────────┤
          │   valide     │   invalide     │
          └──────┬───────┴───────┬────────┘
                 ▼               ▼
        (R3 Course enregistrée)  (R4 Commande refusée)

 (R3 Course enregistrée)  OU  (E4 Heure prévue − 15 min atteinte)  OU  (E5 Délai de réponse de 20 s écoulé)
                          OU  (E6 Refus du chauffeur)  OU  (E7 Annulation par le chauffeur)
                                        │
                ┌───────────────────── OU ──────────────────────┐
                │ OP3 — ATTRIBUER LA COURSE                     │
                │ • rechercher les chauffeurs disponibles à     │
                │   ≤ 10 km, triés par distance (RG31)          │
                │ • exclure ceux déjà sollicités ou ayant refusé│
                │ • si moins de 3 sollicités et un candidat :   │
                │   le solliciter pendant 20 s                  │
                │ • sinon : ouvrir la course à tous             │
                ├────────────────────────┬──────────────────────┤
                │ candidat trouvé        │ aucun candidat / 3 atteints
                └───────────┬────────────┴───────────┬──────────┘
                            ▼                        ▼
             (R5 Proposition au chauffeur)   (R6 Course ouverte à tous les chauffeurs proches)

 (E8 Acceptation par un chauffeur)
                │
 ┌──────────────┴───────────────────┐
 │ OP4 — CONFIRMER LA PRISE EN CHARGE│
 │ • vérifier : chauffeur validé,    │
 │   abonnement actif, documents OK, │
 │   en ligne, sans course en cours  │
 │ • vérifier : course encore        │
 │   proposée à ce chauffeur, ou     │
 │   ouverte à tous                  │
 │ • enregistrer le chauffeur        │
 ├──────────────┬────────────────────┤
 │ conditions OK│ course déjà prise / conditions non remplies
 └──────┬───────┴──────┬─────────────┘
        ▼              ▼
 (R7 Course attribuée : passager prévenu,      (R8 Refus d'acceptation)
     numéro communiqué au chauffeur)

 (E9 Signal « je suis arrivé »)   (E10 Signal « démarrer »)   (E11 Positions du chauffeur)
               \                         |                         /
                ┌─────────────────────── OU ───────────────────────┐
                │ OP5 — SUIVRE LE TRAJET                            │
                │ • enregistrer l'étape (arrivé / en cours)        │
                │ • transmettre position et étape au passager      │
                ├──────────────────────────────────────────────────┤
                │ toujours                                          │
                └──────────────────────┬───────────────────────────┘
                                       ▼
                         (R9 Passager informé en temps réel)

 (E12 Signal « terminer la course »)
                │
 ┌──────────────┴──────────────┐
 │ OP6 — CLÔTURER LA COURSE    │
 │ • enregistrer la fin        │
 │ • afficher le montant à     │
 │   encaisser en espèces      │
 ├─────────────────────────────┤
 │ toujours                    │
 └──────────────┬──────────────┘
                ▼
 (R10 Course terminée — invitation à noter)

 (E13 Note du passager)  OU  (E14 Note du chauffeur)
                       \       /
          ┌────────────── OU ───────────────┐
          │ OP7 — ENREGISTRER L'ÉVALUATION   │
          │ • vérifier : course terminée,    │
          │   pas encore notée dans ce sens  │
          │ • enregistrer note + commentaire │
          │ • mettre à jour le cumul des notes│
          ├────────────────┬─────────────────┤
          │   valide       │   invalide      │
          └───────┬────────┴────────┬────────┘
                  ▼                 ▼
           (R11 Note enregistrée)  (R12 Refus)

 (E15 Annulation par le passager) OU (E16 Annulation par l'administrateur)
                                  OU (E17 5 minutes après l'heure prévue sans chauffeur — événement temporel)
                                  OU (E7 Annulation par le chauffeur)
                                              │
              ┌──────────────────────────── OU ─────────────────────────────┐
              │ OP8 — ANNULER LA COURSE                                      │
              │ • vérifier que la course n'a pas démarré (sauf admin)        │
              │ • si annulée par le chauffeur : remettre la course en attente│
              │   et l'exclure pour ce chauffeur (→ OP3)                     │
              │ • sinon : marquer « annulée » avec son auteur                │
              │ • prévenir les personnes concernées                          │
              ├────────────────────────────┬─────────────────────────────────┤
              │ annulation définitive      │ annulation par le chauffeur     │
              └─────────────┬──────────────┴────────────────┬────────────────┘
                            ▼                               ▼
                   (R13 Course annulée)            (R14 Course remise en attente → E7)
```

#### 5.3.2 MCT du domaine « Gestion des chauffeurs et des abonnements »

**Figure 10 : MCT — Gestion des chauffeurs et des abonnements**

```
 (E20 Demande d'inscription : identité, moto, permis, code de parrainage)   (E21 Code SMS saisi)
                                          \                                   /
                              ┌──────────────────── ET ─────────────────────┐
                              │ OP9 — INSCRIRE LE CHAUFFEUR                  │
                              │ • vérifier le code SMS, l'unicité du numéro  │
                              │ • vérifier le code de parrainage s'il y a lieu│
                              │ • créer le compte (statut « à valider »)     │
                              │ • attribuer un code de parrainage            │
                              ├──────────────────────┬──────────────────────┤
                              │   valide             │   invalide           │
                              └──────────┬───────────┴──────────┬───────────┘
                                         ▼                      ▼
                              (R20 Chauffeur à valider)   (R21 Inscription refusée)

 (E22 Envoi d'un document : photo, permis, carte grise, pièce d'identité, assurance)
                │
 ┌──────────────┴──────────────────────┐
 │ OP10 — ENREGISTRER LE DOCUMENT       │
 │ • vérifier le format et la taille    │
 │ • vérifier la date d'expiration      │
 │   (permis, assurance)                │
 │ • remplacer l'ancien document du     │
 │   même type ; si chauffeur validé,   │
 │   le repasser « à valider » (RG15)   │
 ├───────────────┬──────────────────────┤
 │ valide        │ invalide             │
 └──────┬────────┴──────────┬───────────┘
        ▼                   ▼
 (R22 Document enregistré) (R23 Document refusé)

 (R20 Chauffeur à valider)   (E23 Décision de l'administrateur)
                     \          /
               ┌──────── ET ────────┐
               │ OP11 — STATUER SUR │
               │ LE CHAUFFEUR       │
               │ • enregistrer la   │
               │   décision         │
               │ • notifier (+ SMS) │
               │ • inscrire au      │
               │   journal          │
               ├─────────┬──────────┤
               │ validé  │ suspendu │
               └────┬────┴────┬─────┘
                    ▼         ▼
       (R24 Chauffeur validé) (R25 Chauffeur suspendu, mis hors ligne)

 (E24 Choix d'une formule par le chauffeur)
                │
 ┌──────────────┴──────────────────┐
 │ OP12 — ENREGISTRER LA DEMANDE    │
 │ D'ABONNEMENT                     │
 │ • vérifier : aucune demande en   │
 │   attente (RG18)                 │
 │ • figer le montant en vigueur    │
 ├──────────────┬───────────────────┤
 │  valide      │  déjà une demande │
 └──────┬───────┴─────────┬─────────┘
        ▼                 ▼
 (R26 Demande en attente) (R27 Refus)

 (R26 Demande en attente)   (E25 Paiement reçu par l'équipe — espèces ou Mobile Money, hors système)
                     \          /
               ┌──────── ET ────────────────────┐
               │ OP13 — ACTIVER L'ABONNEMENT     │
               │ • calculer la période : à partir│
               │   de la fin de l'abonnement en  │
               │   cours, sinon maintenant (RG19)│
               │ • prolonger la date de fin      │
               │ • si premier abonnement d'un    │
               │   filleul : offrir des jours au │
               │   parrain (RG21)                │
               │ • notifier, inscrire au journal │
               ├────────────────┬────────────────┤
               │ paiement reçu  │ demande refusée│
               └───────┬────────┴───────┬────────┘
                       ▼                ▼
          (R28 Abonnement actif)  (R29 Demande refusée)

 (E26 Chaque heure — événement temporel)
                │
 ┌──────────────┴───────────────────────┐
 │ OP14 — SURVEILLER LES ÉCHÉANCES       │
 │ • abonnement expirant dans 3 jours /  │
 │   1 jour non encore rappelé           │
 │ • permis ou assurance expirant dans   │
 │   30 jours non encore rappelé         │
 │ • abonnement expiré : mettre hors     │
 │   ligne (sauf course en cours)        │
 ├──────────────────┬────────────────────┤
 │ échéance proche  │ échéance dépassée  │
 └────────┬─────────┴─────────┬──────────┘
          ▼                   ▼
 (R30 Rappel : notification + SMS)  (R31 Chauffeur mis hors ligne)

 (E27 Demande de passage en ligne)
                │
 ┌──────────────┴───────────────────┐
 │ OP15 — METTRE EN SERVICE          │
 │ • vérifier : validé, abonnement   │
 │   actif, documents (si exigés)    │
 │ • ouvrir une période en ligne     │
 ├──────────────┬────────────────────┤
 │ conditions OK│ conditions non remplies
 └──────┬───────┴──────┬─────────────┘
        ▼              ▼
 (R32 Chauffeur en ligne → E5/OP3)  (R33 Refus motivé)
```

#### 5.3.3 MCT du domaine « Sécurité et relation client »

**Figure 11 : MCT — Sécurité et relation client**

```
 (E30 Bouton d'urgence 🆘 touché)
                │
 ┌──────────────┴──────────────────────┐
 │ OP16 — DÉCLENCHER L'ALERTE           │
 │ • enregistrer l'alerte et la position│
 │ • créer le lien de suivi de la course│
 │ • alerter l'équipe (temps réel, push)│
 │ • SMS à la personne à prévenir       │
 ├──────────────────┬───────────────────┤
 │ moins de 3 alertes en 10 min │ limite atteinte
 └────────┬─────────┴─────────┬─────────┘
          ▼                   ▼
 (R40 Alerte en cours)  (R41 « Alerte déjà envoyée »)

 (R40 Alerte en cours)   (E31 Intervention de l'équipe : appel, note)
                  \         /
            ┌──────── ET ────────┐
            │ OP17 — CLÔTURER     │
            │ L'ALERTE            │
            ├─────────────────────┤
            │ toujours            │
            └──────────┬──────────┘
                       ▼
             (R42 Alerte traitée — journal)

 (E32 Réclamation déposée)
                │
 ┌──────────────┴─────────────┐
 │ OP18 — ENREGISTRER LA       │
 │ RÉCLAMATION                 │
 │ • catégorie, message ≥ 10   │
 │ • course appartenant à       │
 │   l'auteur (si indiquée)    │
 │ • au plus 5 en cours        │
 ├─────────────┬───────────────┤
 │ valide      │ invalide      │
 └──────┬──────┴──────┬────────┘
        ▼             ▼
 (R43 Réclamation ouverte)  (R44 Refus)

 (R43 Réclamation ouverte)   (E33 Réponse de l'équipe)
                    \           /
             ┌──────── ET ────────┐
             │ OP19 — TRAITER LA  │
             │ RÉCLAMATION        │
             ├────────────────────┤
             │ toujours           │
             └─────────┬──────────┘
                       ▼
        (R45 Réclamation traitée — réponse notifiée à l'auteur)

 (E34 Demande de partage de la course en cours)
                │
 ┌──────────────┴────────────┐
 │ OP20 — PARTAGER LA COURSE │
 │ • créer un jeton secret   │
 ├───────────────────────────┤
 │ course en cours           │
 └──────────────┬────────────┘
                ▼
 (R46 Lien de suivi envoyé au proche — valable jusqu'à 1 h après la fin)
```

**Tableau 13 : Récapitulatif des opérations du MCT**

| N° | Opération | Événements déclencheurs | Synchronisation | Résultats |
|---|---|---|---|---|
| OP1 | Estimer le prix | E1 | — | R1 / R2 |
| OP2 | Enregistrer la commande | E2, E3 | E2 ET E3 (si invité) | R3 / R4 |
| OP3 | Attribuer la course | R3, E4, E5, E6, E7 | OU | R5 / R6 |
| OP4 | Confirmer la prise en charge | E8 | — | R7 / R8 |
| OP5 | Suivre le trajet | E9, E10, E11 | OU | R9 |
| OP6 | Clôturer la course | E12 | — | R10 |
| OP7 | Enregistrer l'évaluation | E13, E14 | OU | R11 / R12 |
| OP8 | Annuler la course | E15, E16, E17, E7 | OU | R13 / R14 |
| OP9 | Inscrire le chauffeur | E20, E21 | ET | R20 / R21 |
| OP10 | Enregistrer un document | E22 | — | R22 / R23 |
| OP11 | Statuer sur le chauffeur | R20, E23 | ET | R24 / R25 |
| OP12 | Enregistrer la demande d'abonnement | E24 | — | R26 / R27 |
| OP13 | Activer l'abonnement | R26, E25 | ET | R28 / R29 |
| OP14 | Surveiller les échéances | E26 (temporel) | — | R30 / R31 |
| OP15 | Mettre en service | E27 | — | R32 / R33 |
| OP16 | Déclencher l'alerte | E30 | — | R40 / R41 |
| OP17 | Clôturer l'alerte | R40, E31 | ET | R42 |
| OP18 | Enregistrer la réclamation | E32 | — | R43 / R44 |
| OP19 | Traiter la réclamation | R43, E33 | ET | R45 |
| OP20 | Partager la course | E34 | — | R46 |

### 5.4 Le Modèle Organisationnel des Traitements (MOT)

Le MOT reprend les opérations du MCT et précise, pour chaque **procédure fonctionnelle** : le **moment** (début, durée), le **poste de travail** qui l'exécute et la **nature** de la tâche.

**Postes de travail**

| Poste | Matériel | Description |
|---|---|---|
| P1 — Passager | Smartphone (navigateur ou application installée) | Commande et suivi |
| P2 — Chauffeur | Smartphone avec GPS | Réception et réalisation des courses |
| P3 — Administrateur | Ordinateur ou smartphone (site d'administration) | Supervision |
| P4 — Système | Serveur de l'API (hébergé en ligne) | Traitements automatiques, attribution, notifications |
| P5 — Opérateur SMS | Plateforme de l'opérateur | Acheminement des SMS |

**Nature des tâches** : **M** = manuelle (sans ordinateur) ; **C** = conversationnelle (l'utilisateur dialogue avec l'application) ; **A** = automatique (exécutée par le système sans intervention).

#### 5.4.1 MOT — Commande et déroulement d'une course

**Tableau 14 : MOT — Commande et déroulement d'une course**

| Début / Durée | Poste | Nature | Procédure fonctionnelle | Résultats |
|---|---|---|---|---|
| À tout moment / 1 min | P1 Passager | C | **PF1 — Saisir le trajet** : choisir le départ (position GPS, lieu favori, recherche, carte) et la destination ; choisir « Maintenant » ou « Plus tard », « Pour moi » ou « Un proche » | Trajet saisi |
| Immédiat / < 1 s | P4 Système | A | **PF2 — Calculer le prix** (OP1) : distance, tarif, majorations | Prix affiché |
| Immédiat / 1 min | P1 Passager | C | **PF3 — Commander** : confirmer ; si invité, saisir nom, numéro et code SMS reçu | Demande transmise |
| Immédiat / < 1 s | P4 Système | A | **PF4 — Enregistrer la commande** (OP2) | Course enregistrée ou refus motivé |
| Immédiat, puis toutes les 3 s | P4 Système | A | **PF5 — Attribuer la course** (OP3) : sollicitation du chauffeur le plus proche (20 s), puis du suivant, puis ouverture à tous | Proposition affichée chez le chauffeur (son, vibration, notification) |
| Dès réception / ≤ 20 s | P2 Chauffeur | C | **PF6 — Répondre à la proposition** : accepter ou refuser | Réponse transmise |
| Immédiat / < 1 s | P4 Système | A | **PF7 — Confirmer la prise en charge** (OP4) ; informer le passager (nom, moto, plaque, photo, note, temps d'arrivée) | Course attribuée |
| Pendant l'approche | P2 Chauffeur | M + C | **PF8 — Rejoindre le passager** (navigation GPS) ; signaler « Je suis arrivé » | Étape « arrivé » |
| Toutes les 1,5 à 20 s | P4 Système | A | **PF9 — Transmettre la position** au passager (et au proche si partage) | Suivi en temps réel |
| À l'arrivée | P2 Chauffeur | C | **PF10 — Démarrer la course** | Étape « en cours » |
| À destination | P2 Chauffeur | C | **PF11 — Terminer la course** (OP6) | Montant à encaisser affiché |
| À destination / 1 min | P1 et P2 | M | **PF12 — Payer et encaisser** en espèces (hors système) | Course réglée |
| Après la course / 1 min | P1 et P2 | C | **PF13 — Noter** (OP7) | Notes enregistrées |
| 5 min après l'heure prévue sans chauffeur | P4 Système | A | **PF14 — Annuler automatiquement** (OP8) et prévenir le passager | Course annulée |

**Figure 12 : MOT — Commande et déroulement d'une course (couloirs par poste)**

```
 TEMPS │ P1 PASSAGER (C)          │ P4 SYSTÈME (A)                │ P2 CHAUFFEUR (C/M)
───────┼──────────────────────────┼───────────────────────────────┼─────────────────────────────
  t0   │ PF1 Saisir le trajet ────┼─► PF2 Calculer le prix        │
       │ ◄── prix affiché ────────┼───                            │
  t0+1 │ PF3 Commander (+ code SMS┼─► PF4 Enregistrer la commande │
       │       si invité)         │        │                      │
  t0+1 │                          │   PF5 Attribuer (toutes les 3 s)
       │                          │        ├── proposition ───────┼─► PF6 Répondre (≤ 20 s)
       │                          │        │◄── refus / silence ──┼──     │
       │                          │        │  → chauffeur suivant │       │ accepte
       │                          │   PF7 Confirmer ◄─────────────┼───────┘
       │ ◄── chauffeur trouvé ────┼───     │                      │
  t1   │ suit la moto sur la carte◄┼── PF9 Transmettre position ◄─┼── PF8 Rejoindre, « arrivé »
  t2   │ monte sur la moto        │                               │ PF10 Démarrer
  t3   │ ◄── « terminée » ────────┼─── PF11 enregistrée ◄─────────┼── PF11 Terminer
       │ PF12 Payer (espèces) ────┼───────────── (hors système) ──┼─► PF12 Encaisser (M)
       │ PF13 Noter le chauffeur ─┼─► enregistrement ◄────────────┼── PF13 Noter le passager
```

#### 5.4.2 MOT — Inscription, validation et abonnement d'un chauffeur

**Tableau 15 : MOT — Chauffeur**

| Début / Durée | Poste | Nature | Procédure fonctionnelle | Résultats |
|---|---|---|---|---|
| À tout moment / 5 min | P2 Chauffeur | C | **PF20 — S'inscrire** : identité, moto, numéro de permis, code de parrainage éventuel, code SMS | Compte « à valider » |
| Immédiat | P5 Opérateur SMS | A | **PF21 — Acheminer le code SMS** | Code reçu |
| Après l'inscription / 10 min | P2 Chauffeur | C | **PF22 — Envoyer les documents** (photos prises avec le téléphone, dates d'expiration) | Documents enregistrés |
| Jours ouvrables / 5 min par dossier | P3 Administrateur | M + C | **PF23 — Vérifier le dossier** (contrôle visuel des documents, éventuellement en présence du chauffeur) puis **valider ou refuser** (OP11) | Chauffeur validé / suspendu, notifié par SMS |
| Après validation / 1 min | P2 Chauffeur | C | **PF24 — Choisir une formule d'abonnement** (OP12) | Demande en attente |
| Au bureau SURPLACE | P2 Chauffeur et P3 | M | **PF25 — Payer l'abonnement** (espèces ou Mobile Money, hors système) | Paiement reçu |
| Après paiement / 1 min | P3 Administrateur | C | **PF26 — Confirmer le paiement** (OP13) | Abonnement actif, notification ; jours offerts au parrain s'il y a lieu |
| Toutes les heures | P4 Système | A | **PF27 — Surveiller les échéances** (OP14) : rappels J-3, J-1, documents ; mise hors ligne à l'expiration | Rappels envoyés |
| Chaque jour de travail | P2 Chauffeur | C | **PF28 — Passer en ligne** (OP15) | Chauffeur disponible |

**Figure 13 : MOT — Chauffeur (couloirs)**

```
 P2 CHAUFFEUR (C/M)          │ P4 SYSTÈME (A)                  │ P3 ADMINISTRATEUR (C/M)
─────────────────────────────┼─────────────────────────────────┼──────────────────────────────
 PF20 S'inscrire ────────────┼─► compte « à valider »          │
 (code SMS ◄── P5) ──────────┤   pastille « à valider » ───────┼─► voit la demande
 PF22 Envoyer documents ─────┼─► stockage, contrôle format     │
                             │                                 │ PF23 Vérifier le dossier (M+C)
 ◄── « Compte validé » (SMS)─┼─── notification ◄───────────────┼── Valider
 PF24 Choisir une formule ───┼─► demande en attente ───────────┼─► pastille « paiement à confirmer »
 PF25 Payer au bureau (M) ───┼──────────── (hors système) ─────┼─► PF25 Encaisser (M)
 ◄── « Abonnement activé » ──┼─── prolongation, journal ◄──────┼── PF26 Confirmer le paiement
 PF28 Passer en ligne ───────┼─► période en ligne ouverte      │
                             │ PF27 Rappels J-3 / J-1 (A)      │
 ◄── rappel (SMS + notif.) ──┼───                              │
```

#### 5.4.3 MOT — Alerte d'urgence

**Tableau 16 : MOT — Alerte d'urgence**

| Début / Durée | Poste | Nature | Procédure fonctionnelle | Résultats |
|---|---|---|---|---|
| À tout moment pendant une course | P1 Passager ou P2 Chauffeur | C | **PF30 — Déclencher l'alerte** (bouton 🆘, confirmation) | Alerte transmise avec la position |
| Immédiat / < 2 s | P4 Système | A | **PF31 — Diffuser l'alerte** (OP16) : bandeau rouge et alarme sonore chez l'équipe, notification push, SMS à la personne à prévenir avec le lien de suivi | Équipe et proche prévenus |
| Immédiat | P5 Opérateur SMS | A | **PF32 — Acheminer le SMS** | SMS reçu par le proche |
| Dans les minutes qui suivent | P3 Administrateur | M + C | **PF33 — Intervenir** : appeler la personne, le chauffeur, les secours si nécessaire ; **clôturer** l'alerte avec une note (OP17) | Alerte traitée, inscrite au journal |
| En parallèle | P1 / P2 | M | **PF34 — Appeler les secours** depuis l'écran d'urgence (110, 111, 180, 185) si besoin | — |

### 5.5 Les schémas d'accès théorique (SAT)

Les **SAT** confrontent les traitements aux données : pour chaque opération, ils indiquent quelles **relations** sont utilisées, dans quel **ordre**, par quelle **clé d'accès**, et pour quelle **action** : Lecture (L), Création (C), Modification (M), Suppression (S). Ils permettent de vérifier que le modèle de données permet bien tous les traitements, et de justifier les **index** du MPD.

#### 5.5.1 Matrice des accès

**Tableau 17 : Matrice des accès (opérations × relations)**

| Opération | UTILISATEUR | CHAUFFEUR | COURSE | PROPOSER | ABONNEMENT | DOCUMENT | CODE_VERIF. | PARAMETRE | NOTIFICATION | ALERTE | RECLAMATION | JOURNAL | Autres |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| OP1 Estimer le prix | | | | | | | | L | | | | | |
| OP2 Enregistrer la commande | L, C (invité) | | L, C | | | | L, M | L | | | | | SESSION : C |
| OP3 Attribuer | | L | L, M | L, C, M | | L | | L | | | | | |
| OP4 Confirmer la prise en charge | L | L | L, M | M | | L | | | C | | | | |
| OP5 Suivre le trajet | | M (position) | L, M | | | | | | | | | | |
| OP6 Clôturer | | | M | | | | | | C | | | | |
| OP7 Évaluer | M (cumul) | M (cumul) | L, M | | | | | | | | | | |
| OP8 Annuler | | | L, M | M, C | | | | | C | | | | |
| OP9 Inscrire | L, C | C | | | | | L, M | | | | | | SESSION : C |
| OP10 Document | | L, M | | | | C, S | | | | | | | |
| OP11 Statuer | | L, M | | | | L | | | C | | | C | |
| OP12 Demande d'abonnement | | L | | | L, C | | | L | | | | | |
| OP13 Activer l'abonnement | L | L, M | | | L, M | | | L | C | | | C | |
| OP14 Échéances | L | L, M | L | | | L, M | L, S | | C | | | | PERIODE : M |
| OP15 Mettre en service | | L, M | L | | | L | | L | | | | | PERIODE : C |
| OP16 Déclencher l'alerte | L | | L, M (jeton) | | | | | | | C | | | |
| OP17 Clôturer l'alerte | | | | | | | | | | M | | C | |
| OP18-19 Réclamations | L | | L | | | | | | C | | C, M | C | |
| OP20 Partager | | | L, M | | | | | | | | | | |

#### 5.5.2 SAT de l'opération OP2 — Enregistrer la commande

```
  Paramètres : départ, destination, heure prévue, bénéficiaire, [nom, numéro, code SMS si invité]

  ① PARAMETRE           accès par clé cle_param = 'app'           L   tarif, majorations
           │
  ② CODE_VERIFICATION   accès par (tel_code, objet_code)  [index]  L   code valide et non expiré ?   (invité)
           │                                                       M   date_utilisation_code
  ③ UTILISATEUR         —                                          C   compte invité               (invité)
           │
  ④ COURSE              accès par #id_passager + statut  [index]   L   aucune course active ?
           │
  ⑤ COURSE              —                                          C   nouvelle course (prix figé)
           │
  ⑥ SESSION             —                                          C   connexion de l'invité        (invité)
```

#### 5.5.3 SAT de l'opération OP3 — Attribuer la course

```
  ① COURSE              accès par statut = 'demandée'  [index rides_status_idx]     L
           │            (et heure prévue ≤ maintenant + 15 min, non ouverte à tous)
           │
  ② PROPOSER            accès par #id_course  [clé]                                  L   chauffeurs déjà sollicités
           │
  ③ CHAUFFEUR           parcours filtré : en ligne, validé, abonnement actif,        L   candidats
           │            position récente ; calcul de la distance au départ
           │
  ④ COURSE              accès par #id_chauffeur + statut actif  [index]              L   candidat libre ?
           │
  ⑤ DOCUMENT            accès par (#id_chauffeur, type_doc)  [index unique]          L   documents en règle ?
           │
  ⑥ PROPOSER            —                                                            C   (id_course, id_chauffeur, en attente)
           │
  ⑦ COURSE              accès par id_course  [clé]                                   M   id_chauffeur_sollicite, date_fin_offre
                                                                                         ou ouverte_a_tous = oui
```

#### 5.5.4 SAT de l'opération OP4 — Confirmer la prise en charge

```
  ① CHAUFFEUR           accès par id_util  [clé]                    L   validé ? abonnement actif ? en ligne ?
           │
  ② DOCUMENT            accès par #id_chauffeur  [index]            L   documents en règle ?
           │
  ③ COURSE              accès par #id_chauffeur + statut  [index]   L   aucune course en cours ?
           │
  ④ COURSE              accès par id_course  [clé]                  M   statut ← 'acceptée', #id_chauffeur,
           │            condition : statut = 'demandée' ET              date_acceptation
           │            (ouverte_a_tous OU sollicité = ce chauffeur et offre non expirée)
           │            → si 0 ligne modifiée : course déjà prise (refus)
           │
  ⑤ PROPOSER            accès par (id_course, id_chauffeur)  [clé]  M/C réponse ← 'acceptée'
           │
  ⑥ NOTIFICATION / push —                                           C   « Chauffeur trouvé » au passager
```

La **condition** placée dans la modification ④ garantit qu'une course ne peut pas être attribuée à deux chauffeurs, même s'ils acceptent au même instant : c'est la base de données qui arbitre.

#### 5.5.5 SAT de l'opération OP13 — Activer l'abonnement

```
  ① ABONNEMENT          accès par id_abo  [clé]                     L   statut = 'en attente' ?
           │
  ② CHAUFFEUR           accès par #id_chauffeur  [clé]              L   date_fin_abo actuelle
           │
  ③ PARAMETRE           accès par clé                               L   durée de la formule, jours de parrainage
           │
  ④ ABONNEMENT          accès par id_abo                            M   statut ← 'payé', dates de période
           │
  ⑤ CHAUFFEUR           accès par id_util                           M   date_fin_abo ← fin de la nouvelle période
           │
  ⑥ CHAUFFEUR (parrain) accès par #id_parrain  [clé]                M   si premier abonnement : + jours offerts,
           │                                                            recompense_versee ← oui (filleul)
  ⑦ NOTIFICATION        —                                           C   « Abonnement activé » (chauffeur, parrain)
           │
  ⑧ JOURNAL_ACTION      —                                           C   « Paiement d'abonnement confirmé »
```

Les étapes ④ à ⑥ sont exécutées dans une **transaction** : soit elles réussissent toutes, soit aucune n'est enregistrée.

#### 5.5.6 SAT de l'opération OP16 — Déclencher l'alerte

```
  ① COURSE              accès par id_course  [clé]                  L   la course appartient-elle à l'auteur ?
           │                                                       M   jeton_partage (créé s'il manque)
  ② ALERTE              —                                           C   nouvelle alerte (position, date)
           │
  ③ UTILISATEUR (admins) accès par role_util = 'administrateur'     L   destinataires de l'alerte (push)
           │
  ④ UTILISATEUR (auteur) accès par id_util  [clé]                   L   personne à prévenir → SMS
```

### 5.6 Validation croisée données / traitements

La matrice des accès montre que **chaque relation du MLD-R est utilisée** par au moins une opération, et que **chaque opération trouve dans le modèle** les données dont elle a besoin. Les accès les plus fréquents (recherche des courses par statut, par passager, par chauffeur ; documents par chauffeur ; codes SMS par numéro) disposent d'un **index** dans le MPD. Le modèle de données est donc validé par les traitements.
