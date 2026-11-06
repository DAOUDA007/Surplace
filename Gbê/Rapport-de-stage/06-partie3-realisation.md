# TROISIÈME PARTIE : RÉALISATION ET MISE EN ŒUVRE

Cette partie présente la traduction de la conception en une application fonctionnelle : les outils retenus, l'architecture technique, l'application elle-même, puis les tests, la mise en ligne, le coût et le bilan du projet.

---

## CHAPITRE 6 : ENVIRONNEMENT DE DÉVELOPPEMENT ET ARCHITECTURE

### 6.1 Environnement matériel

| Matériel | Caractéristiques |
|---|---|
| Ordinateur de développement | [À COMPLÉTER : marque, processeur, mémoire, système — ex. Windows 11] |
| Téléphones de test | [À COMPLÉTER : modèles Android / iPhone utilisés pour les essais] |
| Connexion internet | [À COMPLÉTER] |

### 6.2 Outils et technologies

**Tableau 18 : Outils et technologies**

| Domaine | Outil | Rôle dans le projet | Justification |
|---|---|---|---|
| Conception | **Looping** [À COMPLÉTER : ou l'outil utilisé] | Dessin du MCD, génération du MLD | Gratuit, en français, conforme à MERISE |
| Langage | **TypeScript** | Langage de tout le projet (serveur et sites) | JavaScript avec vérification des types : moins d'erreurs |
| Serveur | **Node.js 22** | Exécution du serveur | Rapide, très répandu, même langage que les sites |
| Serveur | **Express** | Réception des requêtes et routes de l'API | Simple et éprouvé |
| Base de données | **SQLite** (bibliothèque better-sqlite3) | Stockage des données | Base complète dans un seul fichier, sans administration |
| Interface | **Next.js 15** et **React 19** | Construction des deux sites (Application, Administration) | Pages préparées sur le serveur, rapides ; composants réutilisables |
| Interface | **Tailwind CSS** | Mise en forme, mode sombre, mode « gros caractères » | Rapide à écrire, cohérent |
| Cartographie | **Leaflet** et **OpenStreetMap** | Carte interactive, suivi de la moto | Gratuits, sans clé ni facturation |
| Cartographie | **Nominatim** | Recherche d'adresses à Korhogo | Gratuit, basé sur OpenStreetMap |
| Itinéraires | **OSRM** (facultatif) | Distance par la route | Logiciel libre, installable sur son propre serveur |
| Temps réel | **Server-Sent Events (SSE)** | Positions et étapes envoyées en direct | Simple, reconnexion automatique |
| Notifications | **Web Push** (bibliothèque web-push) | Notifications sur le téléphone, même application fermée | Standard des navigateurs, gratuit |
| SMS | **API SMS d'Orange** | Codes de vérification, rappels, alertes | Opérateur présent en Côte d'Ivoire |
| E-mail | **Nodemailer** (Gmail) | E-mail de bienvenue | Gratuit pour un faible volume |
| Versions | **Git** et **GitHub** | Historique du code, sauvegarde, déploiement automatique | Standard de l'industrie |
| Éditeur | **Visual Studio Code** | Écriture du code | Gratuit, complet |
| Tests | **Node.js test runner** | Tests automatiques de l'API | Intégré à Node.js |
| Hébergement | **Render** (API et base) et **Vercel** (sites) | Mise en ligne | Déploiement automatique depuis GitHub, HTTPS inclus |

### 6.3 Architecture technique

SURPLACE suit une **architecture trois tiers** :

1. le **client** : le navigateur du téléphone ou de l'ordinateur ;
2. le **serveur d'application** : deux sites Next.js (Application et Administration) qui construisent les pages et relaient les demandes de données ;
3. le **serveur de données** : l'API Express, seule à accéder à la base SQLite.

**Figure 14 : Architecture technique de SURPLACE**

```
 ┌───────────────────────────────┐          ┌───────────────────────────────┐
 │  TÉLÉPHONE DU PASSAGER /      │          │  ORDINATEUR OU TÉLÉPHONE      │
 │  DU CHAUFFEUR (navigateur,    │          │  DE L'ÉQUIPE                  │
 │  application installée)       │          │                               │
 └──────────────┬────────────────┘          └──────────────┬────────────────┘
                │ HTTPS                                    │ HTTPS
                ▼                                          ▼
 ┌───────────────────────────────┐          ┌───────────────────────────────┐
 │  APPLICATION (Next.js)        │          │  ADMINISTRATION (Next.js)     │
 │  accueil, passagers,          │          │  tableau de bord, urgences,   │
 │  chauffeurs, suivi partagé    │          │  chauffeurs, tarifs, rapports │
 └──────────────┬────────────────┘          └──────────────┬────────────────┘
                │ /api/… (relais)                          │ /api/… (relais)
                └──────────────────┬───────────────────────┘
                                   ▼
                 ┌───────────────────────────────────┐        ┌──────────────────┐
                 │  API (Node.js + Express)          │───────►│ Opérateur SMS    │
                 │  règles de gestion, sécurité,     │───────►│ Services push    │
                 │  attribution des courses,         │───────►│ OSRM (itinéraires)│
                 │  temps réel, tâches planifiées    │        └──────────────────┘
                 └──────────────┬────────────────────┘
                                ▼
                 ┌───────────────────────────────────┐
                 │  BASE SQLite (disque persistant)  │
                 │  + sauvegardes quotidiennes       │
                 │  + photos des documents           │
                 └───────────────────────────────────┘
```

**Pourquoi deux sites distincts ?** L'espace d'administration est séparé de l'application des clients : il peut avoir sa propre adresse et être protégé davantage, et son code n'est jamais envoyé aux téléphones des passagers et des chauffeurs.

**Pourquoi un relais `/api` ?** Le navigateur ne dialogue qu'avec le site qu'il visite ; le site transmet les demandes à l'API. Le cookie de connexion reste ainsi attaché au site, sans configuration complexe.

### 6.4 Organisation du code

```
Surplace/
├── Backend/          API : routes, règles de gestion, base de données, tests automatiques
├── Application/      Site des passagers et des chauffeurs
├── Administration/   Site de l'équipe
├── Commun/           Fichiers partagés (types de données, tarifs, carte, thème…), recopiés automatiquement
├── scripts/          Outil de recopie des fichiers communs
├── deploy/           Fichiers et guide de mise en ligne
└── Gbê/              Documentation technique
```

Le code de l'API est organisé **par domaine**, en cohérence avec les domaines du MCT : `rides` (courses), `dispatch` (attribution), `drivers` (chauffeurs), `documents`, `subscriptions` (abonnements), `referrals` (parrainage), `accounts` (comptes), `alerts` (urgences), `complaints` (réclamations), `reports` (rapports).

### 6.5 Fonctionnement du temps réel

Quand une course change d'état, l'API publie un **événement** (« course mise à jour », « nouvelle demande », « position du chauffeur »…) sur un canal propre à chaque utilisateur. Chaque écran ouvert garde une connexion **SSE** avec l'API et reçoit ces événements instantanément : la moto se déplace sur la carte du passager sans qu'il recharge la page. Si la connexion est coupée, le navigateur se reconnecte seul ; en complément, l'application vérifie l'état toutes les 15 secondes.

Une **tâche planifiée** s'exécute toutes les 3 secondes pour l'attribution des courses (propositions, délais de réponse), et une autre toutes les heures pour les rappels d'échéance et le ménage ; une sauvegarde de la base est faite chaque jour.

### 6.6 Sécurité

| Menace | Mesure mise en place |
|---|---|
| Vol des codes PIN dans la base | PIN jamais stocké en clair : empreinte **scrypt avec sel** ; comparaison en temps constant |
| Essais répétés de codes PIN | **5 essais** par numéro (et 30 par adresse) en 15 minutes, puis blocage temporaire |
| Inscription avec le numéro d'un autre | **Code SMS** à 6 chiffres, valable 10 minutes, 5 essais |
| Vol de session | Cookie **httpOnly**, **SameSite**, **Secure** (HTTPS) ; session révocable en base ; blocage immédiat d'un compte |
| Injection SQL | Requêtes **paramétrées** uniquement |
| Données falsifiées par le navigateur | Toutes les règles (prix, droits, étapes) sont **vérifiées par le serveur** ; le prix envoyé par le navigateur est ignoré |
| Abus (fausses commandes, spam) | **Limitation du nombre de requêtes** par adresse et par numéro |
| Accès aux écrans d'administration | **Rôles** (complet, opérations, finances, modération) vérifiés à chaque requête ; site séparé ; **journal** de toutes les actions |
| Usurpation de chauffeur | **Validation** par l'équipe, **documents** avec dates d'expiration, photo montrée au passager |
| Confidentialité | Numéro du passager révélé au chauffeur seulement après acceptation ; lien de suivi sans données personnelles ; anonymisation des comptes supprimés |
| Perte de données | **Sauvegarde quotidienne** conservée 30 jours, disque persistant |

### 6.7 Adaptation au contexte local

- **Paiement en espèces**, comme aujourd'hui.
- **Commande sans compte**, pour ne pas décourager les nouveaux utilisateurs.
- **Application web installable** : pas de téléchargement depuis un magasin d'applications, peu d'espace occupé.
- **Économie de données** : photos réduites sur le téléphone avant envoi, position envoyée moins souvent en mode économie.
- **Accessibilité** : mode « gros caractères », annonces vocales (en français, et en dioula / sénoufo à partir d'enregistrements), thème sombre.
- **Lieux connus de Korhogo** proposés en premier dans la recherche (gare routière, Grand marché, CHR, université…), modifiables par l'équipe.

---

## CHAPITRE 7 : PRÉSENTATION DE L'APPLICATION

> **[À COMPLÉTER : insérer les captures d'écran.]** Pour de belles captures sur ordinateur : ouvrez l'application dans Chrome, appuyez sur F12, puis sur l'icône « téléphone » (affichage mobile).

### 7.1 L'application des passagers

**Figure 15 : Page d'accueil** — [capture]
Présentation du service, exemple de prix calculé avec le tarif réel, étapes « Comment ça marche » en défilement, offres passager et chauffeur, avis des clients, formulaire de contact.

**Figure 16 : Écran de commande** — [capture]
La carte occupe l'écran ; le départ est placé automatiquement à la position du téléphone. Le passager choisit sa destination (lieux favoris, lieux fréquents, recherche ou carte). Le prix, la distance et la durée s'affichent avant de commander, avec les majorations éventuelles. Il peut choisir « Maintenant » ou « Plus tard », « Pour moi » ou « Un proche ».

**Figure 17 : Commande sans compte** — [capture]
Le visiteur indique son nom et son numéro, reçoit un code par SMS et confirme la commande.

**Figure 18 : Recherche d'un chauffeur puis suivi** — [capture]
Animation de recherche, puis informations du chauffeur (photo, nom, moto, plaque, note), bouton d'appel, temps d'arrivée estimé, moto en mouvement sur la carte, boutons « Partager ma course » et « 🆘 Urgence ».

**Figure 19 : Fin de course et notation** — [capture]
Montant à payer en espèces, étoiles et commentaire.

**Figure 20 : Écran d'urgence** — [capture]
Alerte à l'équipe, appels directs à la ligne SURPLACE et aux secours (110, 111, 180, 185).

**Figure 21 : Suivi partagé (vu par un proche)** — [capture]

### 7.2 L'application des chauffeurs

**Figure 22 : Écran principal du chauffeur** — [capture]
Gains du jour, bouton « Passer en ligne », état de l'abonnement, bouton « Zones demandées ».

**Figure 23 : Course proposée** — [capture]
Carte orange « Course proposée pour vous » avec compte à rebours, trajet, prix, distance, note du passager, boutons « Refuser » et « Accepter » ; signal sonore et vibration.

**Figure 24 : Course en cours** — [capture]
Étapes « Je suis arrivé », « Démarrer », « Terminer », appel du passager, navigation GPS.

**Figure 25 : Gains et statistiques** — [capture]
Gains du jour et de la semaine, temps en ligne, taux d'acceptation, graphique des 7 jours, répartition des notes.

**Figure 26 : Profil et documents** — [capture]
Photos des documents prises avec le téléphone, dates d'expiration, code de parrainage.

### 7.3 L'espace d'administration

**Figure 27 : Connexion de l'équipe** — [capture]

**Figure 28 : Vue d'ensemble** — [capture]
Chiffres du jour, carte des chauffeurs en ligne, éléments à traiter (urgences, chauffeurs à valider, paiements, réclamations, documents expirés), courses des 7 derniers jours.

**Figure 29 : Gestion des chauffeurs** — [capture]
Liste filtrable ; fiche avec vignettes des documents ; validation, suspension, encaissement d'abonnement.

**Figure 30 : Tarifs et réglages** — [capture]
Prix au kilomètre, minimum, majorations de nuit et de pluie, prix des abonnements, mode d'attribution, parrainage, documents obligatoires.

**Figure 31 : Rapports et exports** — [capture]
Rapport du mois (courses, annulations, revenus, nouveaux comptes, heures de pointe, meilleurs chauffeurs, zones demandées) et exports Excel.

**Figure 32 : Journal des actions** — [capture]

---

## CHAPITRE 8 : TESTS, DÉPLOIEMENT, COÛT ET BILAN

### 8.1 Tests

#### 8.1.1 Tests automatiques

Dix-sept **tests automatiques** rejouent les parcours principaux sur une base de données temporaire, en appelant l'API comme le ferait un navigateur. Ils sont lancés avant chaque mise en ligne (commande `npm test`).

**Tableau 19 : Résultats des tests automatiques**

| N° | Scénario testé | Résultat attendu | Résultat |
|---|---|---|---|
| 1 | Disponibilité de l'API | Réponse « ok » | ✅ Réussi |
| 2 | Publication des tarifs et des lieux | Tarif par défaut, 16 lieux | ✅ Réussi |
| 3 | Inscription sans code / avec code faux / avec bon code SMS | Refus, refus, succès | ✅ Réussi |
| 4 | 5 codes PIN faux puis bon code PIN ; « PIN oublié » | Blocage au 6ᵉ essai, puis déblocage par SMS | ✅ Réussi |
| 5 | Connexion d'un administrateur sur l'Application et d'un passager sur l'Administration | Refusées | ✅ Réussi |
| 6 | Estimation du prix | Prix multiple de 25 FCFA | ✅ Réussi |
| 7 | Attribution : proposition au plus proche, refus, ouverture, acceptation par un autre chauffeur, refus d'une double acceptation, déroulement complet, notes croisées, statistiques | Conformes à RG31-RG35 | ✅ Réussi |
| 8 | Commande sans compte puis création du compte | Course conservée | ✅ Réussi |
| 9 | Réservation à 2 h pour un proche | Invisible des chauffeurs | ✅ Réussi |
| 10 | Réservation à 5 minutes | Refusée | ✅ Réussi |
| 11 | Modification du tarif | Prix modifié, action au journal | ✅ Réussi |
| 12 | Administrateur « modération » | Accès aux avis, refus pour les courses et les tarifs | ✅ Réussi |
| 13 | Export Excel des courses | Fichier CSV correct | ✅ Réussi |
| 14 | Alerte d'urgence | Alerte visible et traitable par l'équipe | ✅ Réussi |
| 15 | Rapport mensuel | Course terminée comptabilisée | ✅ Réussi |
| 16 | Sauvegarde de la base | Fichier créé | ✅ Réussi |
| 17 | Cohérence des fichiers communs | Copies à jour | ✅ Réussi |

#### 8.1.2 Recette fonctionnelle

[À COMPLÉTER : tests réalisés à la main sur de vrais téléphones, avec de vrais utilisateurs si possible.]

| Fonctionnalité | Téléphone / navigateur | Résultat | Observations |
|---|---|---|---|
| Localisation GPS du passager | [À COMPLÉTER] | [À COMPLÉTER] | |
| Commande et suivi d'une course réelle | [À COMPLÉTER] | [À COMPLÉTER] | |
| Son et vibration d'une proposition | [À COMPLÉTER] | [À COMPLÉTER] | |
| Notifications téléphone en veille | [À COMPLÉTER] | [À COMPLÉTER] | |
| Installation sur l'écran d'accueil | [À COMPLÉTER] | [À COMPLÉTER] | |
| Envoi de photos de documents | [À COMPLÉTER] | [À COMPLÉTER] | |

### 8.2 Déploiement

L'application a été mise en ligne sur des plateformes d'hébergement en nuage, reliées au dépôt GitHub : chaque mise à jour envoyée sur GitHub est déployée automatiquement.

| Composant | Hébergeur | Configuration |
|---|---|---|
| API et base de données | **Render** (offre Starter) | Node.js 22, disque persistant de 1 Go monté sur `/var/data` pour la base, les photos et les sauvegardes |
| Application (passagers, chauffeurs) | **Vercel** [ou Render] | Next.js, adresse de l'API fournie par variable d'environnement |
| Administration | **Vercel** [ou Render] | Next.js, adresse séparée |

Adresses en production : [À COMPLÉTER : adresses de l'Application, de l'Administration et de l'API].

Après la mise en ligne, les comptes de démonstration ont été remplacés et les tarifs vérifiés depuis l'espace d'administration.

### 8.3 Coût estimatif du projet

Les montants ci-dessous sont indicatifs. Les tarifs des hébergeurs sont en dollars américains : ils sont convertis à environ **600 FCFA pour 1 USD** [À COMPLÉTER : taux du jour].

**Tableau 20 : Coût estimatif du projet**

| Poste | Détail | Coût unitaire | Quantité | Total |
|---|---|---|---|---|
| **Développement** | Analyse, conception, réalisation, tests | [À COMPLÉTER : coût d'une journée de travail] | [À COMPLÉTER : nombre de jours] | [À COMPLÉTER] |
| **Matériel** | Ordinateur et téléphones de test | Existant | — | 0 |
| **Logiciels** | Tous gratuits ou libres (Node.js, Next.js, SQLite, VS Code, Looping…) | 0 | — | 0 |
| **Hébergement de l'API** | Render Starter (≈ 7 USD) + disque 1 Go (≈ 0,25 USD) | ≈ 4 350 FCFA / mois | 12 mois | ≈ 52 200 FCFA / an |
| **Hébergement des sites** | Vercel Pro (≈ 20 USD) ou 2 services Render Starter (≈ 14 USD) | ≈ 8 400 à 12 000 FCFA / mois | 12 mois | ≈ 100 800 à 144 000 FCFA / an |
| **Nom de domaine** | surplace.ci | [À COMPLÉTER : tarif du registraire] | 1 an | [À COMPLÉTER] |
| **SMS** | Codes, rappels, alertes (offre Orange) | [À COMPLÉTER : prix par SMS] | [À COMPLÉTER : volume estimé] | [À COMPLÉTER] |
| **Total annuel d'exploitation** (hors développement) | | | | [À COMPLÉTER] |

Le modèle économique repose sur l'abonnement des chauffeurs : à 1 000 FCFA par mois, [À COMPLÉTER : nombre] chauffeurs abonnés suffisent à couvrir les frais d'hébergement.

### 8.4 Difficultés rencontrées et solutions

**Tableau 21 : Difficultés rencontrées et solutions**

| Difficulté | Solution apportée |
|---|---|
| Comment fixer un prix juste sans mesurer la distance par la route ? | Distance à vol d'oiseau multipliée par un facteur de 1,3, réglable ; itinéraire routier réel avec OSRM quand il est disponible |
| Deux chauffeurs peuvent accepter la même course au même instant | La base de données arbitre : la course n'est attribuée que si elle est encore libre (condition dans la requête de mise à jour) |
| Les navigateurs refusent le GPS sur une adresse non sécurisée | Tests en HTTPS ; mise en ligne avec certificat ; « mode démo » pour les essais sur ordinateur |
| Inciter à l'usage sans imposer la création d'un compte | Commande en invité, vérification du numéro par SMS, transformation ultérieure en compte |
| Garder la même logique sur le serveur et les deux sites sans copier les fichiers à la main | Dossier `Commun` unique, recopié automatiquement avant chaque démarrage |
| Mise en ligne : outil de démarrage du serveur absent (`tsx: not found`) | Installation des dépendances de développement lors de la construction (`npm install --include=dev`) |
| Mise en ligne : base de données impossible à créer (`permission denied /var/data`) | Ajout d'un **disque persistant** (offre payante de l'hébergeur), sans lequel les données seraient effacées à chaque mise à jour |
| Mise en ligne : module SQLite compilé pour une autre version de Node.js | Version de Node.js fixée (22), recompilation du module et vidage du cache de construction |
| Mise en ligne : site d'administration sans version compilée | Commande de construction corrigée (`npm run build`) et port fourni par l'hébergeur (`$PORT`) |
| [À COMPLÉTER : difficultés propres à votre stage — accès au terrain, disponibilité des utilisateurs, connexion…] | |

### 8.5 Apports du stage

**Sur le plan technique** :
- mise en pratique complète de la méthode **MERISE**, de la règle de gestion au modèle physique et au modèle organisationnel des traitements ;
- maîtrise d'un ensemble technique moderne (TypeScript, Node.js, Next.js, SQLite) ;
- découverte du **temps réel**, de la **géolocalisation**, des **notifications** et de la **sécurité** d'une application ;
- pratique des **tests automatiques**, de Git et de la **mise en ligne** sur des plateformes professionnelles.

**Sur le plan professionnel et personnel** : [À COMPLÉTER — ex. rigueur, autonomie, gestion du temps, communication avec les utilisateurs et le maître de stage, capacité à résoudre des problèmes imprévus.]
