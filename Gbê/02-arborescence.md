# 2. Arborescence complète

Voici tous les fichiers suivis par git (hors `node_modules` et fichiers générés), avec leur rôle en une ligne. Les fichiers suivants détaillent chaque partie.

```
Surplace/
│
├── package.json            Scripts qui pilotent les trois projets (dev, build, start…) + concurrently
├── package-lock.json       Versions exactes installées à la racine (généré par npm, ne pas modifier à la main)
├── README.md               Documentation d'utilisation (démarrage, comptes de démo, règles métier)
├── .gitignore              Ce que git ne doit jamais enregistrer (voir plus bas)
├── node_modules/           Paquets installés à la racine (concurrently) — généré
│
├── Gbê/                    ← Cette documentation
│
├── Backend/                ══════ API Express + SQLite (port 4000) ══════
│   ├── package.json        Dépendances et scripts (dev, start, typecheck, reset-admin-pin)
│   ├── package-lock.json   Versions exactes (généré)
│   ├── tsconfig.json       Réglages TypeScript du Backend (vérifie src/ et scripts/)
│   ├── .env.example        Modèle du fichier de secrets (Gmail, adresse du site)
│   ├── .env                (non suivi par git) Vos vrais secrets
│   ├── data/
│   │   ├── .gitkeep        Fichier vide pour que git conserve le dossier
│   │   ├── surplace.db     (non suivi) La base de données, créée au premier lancement
│   │   └── emails/         (non suivi) E-mails enregistrés quand Gmail n'est pas configuré
│   ├── scripts/
│   │   └── reset-admin-pin.ts  Outil en ligne de commande : nouveau PIN pour l'administrateur principal
│   └── src/
│       ├── server.ts       ★ Point d'entrée : crée le serveur, déclare TOUTES les routes /api
│       │
│       │   ── Infrastructure (outils techniques) ──
│       ├── env.ts          Charge Backend/.env dans process.env (importé en tout premier)
│       ├── db.ts           Ouvre SQLite, crée les tables, migre, insère les comptes de démo
│       ├── http.ts         HttpError + route() : transforme résultats et erreurs en réponses JSON
│       ├── validation.ts   Vérifie et nettoie les saisies (téléphone, PIN, e-mail, permis, texte, id)
│       ├── password.ts     Hachage et vérification des codes PIN (scrypt)
│       ├── auth.ts         Sessions par cookie : créer, détruire, lire l'utilisateur connecté
│       ├── events.ts       Bus d'événements temps réel en mémoire (publish / subscribe)
│       ├── mailer.ts       Envoi d'e-mails (Gmail) ou enregistrement en fichier
│       │
│       │   ── Partagés avec les sites (copies à garder identiques) ──
│       ├── types.ts        Types de données : User, Ride, DriverProfile, ServerEvent…
│       ├── pricing.ts      Grille tarifaire, formules d'abonnement, calcul distance/prix
│       ├── site.ts         Coordonnées de contact (pour les e-mails) + SITE_URL
│       │
│       │   ── Règles métier (une thématique par fichier) ──
│       ├── rides.ts        Cycle de vie d'une course (création, accepter, arriver, démarrer, terminer, annuler, noter)
│       ├── drivers.ts      Profil chauffeur : en ligne / hors ligne, position GPS, validation
│       ├── subscriptions.ts Abonnements des chauffeurs : demande, paiement, prolongation, expiration
│       ├── accounts.ts     Profils, PIN, passagers invités, suppression de comptes, administrateurs
│       ├── admin.ts        Statistiques et listes du tableau de bord, suppressions de contenus
│       ├── public.ts       Avis publics de la page d'accueil, messages du formulaire de contact
│       └── emails/
│           └── welcome.ts  Contenu HTML + texte de l'e-mail de bienvenue (passager / chauffeur)
│
├── Application/            ══════ Site public, passagers et chauffeurs — Next.js (port 3000) ══════
│   ├── package.json        Dépendances et scripts
│   ├── tsconfig.json       Réglages TypeScript (dont l'alias @/ → src/)
│   ├── next.config.ts      Le relais /api/* → Backend
│   ├── postcss.config.mjs  Branche Tailwind CSS
│   └── src/
│       ├── app/            ── PAGES : chaque dossier = une adresse ──
│       │   ├── layout.tsx          Squelette HTML commun (police, thème, CSS)
│       │   ├── globals.css         Couleurs, mode sombre, marqueurs de carte, défilement « Comment ça marche »
│       │   ├── icon.png            Icône de l'onglet du navigateur
│       │   ├── page.tsx            /                    Page d'accueil publique
│       │   ├── (auth)/             Groupe de pages SANS effet sur l'adresse (parenthèses)
│       │   │   ├── layout.tsx      Cadre des pages de connexion ; redirige si déjà connecté (sauf invité)
│       │   │   ├── connexion/page.tsx    /connexion    (passagers et chauffeurs)
│       │   │   └── inscription/page.tsx  /inscription  (aussi : un invité y crée son compte)
│       │   ├── passager/
│       │   │   ├── page.tsx            /passager             Écran de commande — OUVERT À TOUS (mode invité)
│       │   │   ├── historique/page.tsx /passager/historique  Mes courses
│       │   │   └── profil/page.tsx     /passager/profil      Mon profil (un invité est envoyé vers /inscription)
│       │   └── chauffeur/
│       │       ├── page.tsx            /chauffeur            Écran chauffeur (carte, demandes)
│       │       ├── historique/page.tsx /chauffeur/historique Mes gains
│       │       └── profil/page.tsx     /chauffeur/profil     Mon profil (moto + permis)
│       │
│       ├── components/
│       │   ├── PassengerApp.tsx    ★ Écran passager (commande avec ou sans compte, suivi, notation)
│       │   ├── DriverApp.tsx       ★ Écran chauffeur (en ligne, demandes, course, mode démo)
│       │   ├── AppShell.tsx        Carte plein écran + barre du haut + panneau (Sheet) ; « Se connecter » pour un visiteur
│       │   ├── AppMenu.tsx         Menu ☰ (liens, thème, déconnexion)
│       │   ├── MapView.tsx         Charge la carte uniquement dans le navigateur
│       │   ├── LeafletMap.tsx      La carte (marqueurs, trajet, recadrage)
│       │   ├── PlaceSearch.tsx     Champ de recherche de lieu avec suggestions
│       │   ├── AuthForms.tsx       Connexion, inscription (avec permis pour les chauffeurs), cadre AuthShell
│       │   ├── ProfilePage.tsx     Page « Mon profil »
│       │   ├── ProfileForm.tsx     Formulaire infos (nom, tél, e-mail, moto, permis) + formulaire PIN
│       │   ├── RideHistory.tsx     Liste des courses passées
│       │   ├── SubscriptionPanel.tsx Abonnement du chauffeur
│       │   ├── ContactForm.tsx     Formulaire de contact de l'accueil
│       │   ├── ThemeToggle.tsx     Bouton clair / sombre / auto
│       │   ├── Logo.tsx            Logo SURPLACE
│       │   └── ui.tsx              Button, StatusBadge, ErrorMessage, Route, Stars
│       ├── hooks/
│       │   ├── useServerEvents.ts  Flux temps réel /api/events (désactivable pour un visiteur)
│       │   └── useSheetHeight.ts   Hauteur du panneau du bas pour recadrer la carte
│       └── lib/
│           ├── api.ts          api() : appel JSON vers /api depuis le navigateur
│           ├── server.ts       backendGet, getSession, homeFor (admin → site d'administration), requirePageUser
│           ├── types.ts        Types partagés
│           ├── pricing.ts      Copie EXACTE de Backend/src/pricing.ts
│           ├── site.ts         Coordonnées de contact + sujets du formulaire
│           ├── places.ts       Korhogo : centre, lieux fréquents, recherche Nominatim
│           ├── geolocation.ts  Localisation GPS précise + messages d'erreur
│           ├── format.ts       Libellés des statuts, dates, téléphones
│           └── theme.ts        Script anti-« flash » du thème
│
└── Administration/         ══════ Espace d'administration — Next.js (port 3001) ══════
    ├── package.json        Dépendances et scripts (port 3001)
    ├── tsconfig.json, next.config.ts, postcss.config.mjs   (mêmes rôles que dans Application)
    └── src/
        ├── app/
        │   ├── layout.tsx          Squelette HTML (titre « Administration », non indexé par Google)
        │   ├── globals.css, icon.png
        │   ├── connexion/page.tsx  /connexion  Connexion réservée aux administrateurs
        │   └── (espace)/           Groupe : toutes les pages qui exigent un admin connecté
        │       ├── layout.tsx      Vérifie l'admin (requireAdmin) + menu latéral (AdminShell)
        │       ├── page.tsx        /                 Vue d'ensemble
        │       ├── courses/        /courses
        │       ├── chauffeurs/     /chauffeurs
        │       ├── passagers/      /passagers
        │       ├── abonnements/    /abonnements
        │       ├── avis/           /avis
        │       ├── messages/       /messages
        │       ├── administrateurs/ /administrateurs
        │       └── compte/         /compte
        ├── components/
        │   ├── LoginForm.tsx       Formulaire de connexion admin (envoie space: "admin")
        │   ├── admin/              Les écrans : AdminShell, OverviewPage, RidesPage, DriversPage, PassengersPage,
        │   │                       SubscriptionsPage, ReviewsPage, MessagesPage, AdminsPage, AccountPage, ui
        │   └── MapView, LeafletMap, Logo, ThemeToggle, ProfileForm, ui   (copies de l'Application)
        ├── hooks/
        │   └── useAdminData.ts     Chargement périodique des données admin + actions
        └── lib/
            ├── server.ts           backendGet, getAdmin, requireAdmin (propre à l'Administration)
            └── api, types, format, pricing, places, theme   (copies de l'Application)
```

## Pourquoi cette organisation ?

### Racine : un « chef d'orchestre » léger

La racine ne contient pas de code applicatif. Son `package.json` lance les **trois** programmes ensemble. C'est un **monorepo** : un seul dépôt git, plusieurs projets indépendants.

### Pourquoi deux sites (Application et Administration) ?

| Avantage | Explication |
|---|---|
| **Sécurité** | L'espace admin peut être mis sur une adresse à part (ex. `admin.surplace.ci`), protégée en plus (pare-feu, accès limité). Le code du tableau de bord n'est jamais envoyé aux passagers et chauffeurs. |
| **Légèreté** | Le site public est plus petit : il charge plus vite sur les téléphones. |
| **Indépendance** | On peut modifier ou redéployer l'admin sans toucher au site des clients, et inversement. |
| **Clarté** | Chaque dossier a un seul public : les clients d'un côté, l'équipe de l'autre. |

Contrepartie : quelques fichiers sont **copiés** dans les deux sites (carte, logo, thème, formulaire de profil, `types.ts`, `pricing.ts`, `format.ts`…). Une correction dans l'un doit être reportée dans l'autre (liste dans [09-modifier-et-points-d-attention.md](09-modifier-et-points-d-attention.md)).

Les deux sites parlent au **même Backend** et à la **même base**.

### Backend : à plat, un fichier par sujet

Trois couches :

1. **`server.ts`** : la porte d'entrée. Chaque route vérifie qui appelle (`requireUser`), puis délègue à une fonction métier.
2. **Les fichiers métier** (`rides.ts`, `drivers.ts`, `subscriptions.ts`, `accounts.ts`, `admin.ts`, `public.ts`) : les règles et les requêtes SQL.
3. **L'infrastructure** (`db.ts`, `auth.ts`, `http.ts`, `events.ts`, `mailer.ts`, `validation.ts`, `password.ts`, `env.ts`).

`scripts/` contient des outils lancés à la main par l'exploitant (pas par le serveur).

### Sites Next.js : la structure imposée par Next.js

- **`src/app/`** : chaque dossier contenant un `page.tsx` devient une adresse. Les fichiers de `app/` sont **très courts** : ils vérifient l'accès puis affichent un composant.
- **`src/components/`** : le vrai travail d'interface.
- **`src/hooks/`** : la logique React réutilisable.
- **`src/lib/`** : les fonctions sans interface (calculs, formats, appels réseau).

### Les dossiers spéciaux de Next.js

| Écriture | Signification | Exemple ici |
|---|---|---|
| `page.tsx` | Le contenu d'une adresse | `Application/src/app/passager/page.tsx` → `/passager` |
| `layout.tsx` | Un cadre qui entoure toutes les pages du dossier et de ses sous-dossiers | `Administration/src/app/(espace)/layout.tsx` entoure tous les écrans admin |
| `(nom)/` | **Groupe de routes** : partage un `layout.tsx` sans apparaître dans l'adresse | `(espace)/courses` → `/courses` ; `(auth)/connexion` → `/connexion` |
| `icon.png` | Icône de l'onglet, détectée automatiquement | `src/app/icon.png` |

Dans l'Administration, `connexion/` est **en dehors** du groupe `(espace)` : la page de connexion ne doit évidemment pas exiger d'être connecté.

## Conventions de nommage

| Élément | Convention | Exemples |
|---|---|---|
| Adresses du site | **Français** | `/passager`, `/chauffeur/historique`, `/abonnements` |
| Code (variables, fonctions, fichiers) | **Anglais** | `createRide`, `DriverApp.tsx`, `subscriptions.ts` |
| Textes affichés, commentaires | **Français** | `"Votre chauffeur est arrivé !"` |
| Composants React | `PascalCase`, un fichier `.tsx` | `PassengerApp`, `LeafletMap` |
| Hooks React | commencent par `use` | `useServerEvents`, `useAdminData` |
| Constantes de configuration | `MAJUSCULES` | `PRICING`, `REQUEST_TIMEOUT_MIN`, `CITY_CENTER` |
| Colonnes SQL | `snake_case` | `pickup_lat`, `license_number` |
| Champs JSON / TypeScript | `camelCase` | `requestedAt`, `licenseNumber`, `isGuest` |

Le passage de `snake_case` (base) à `camelCase` (JSON) se fait dans le Backend, avec `AS` dans le SQL (`paid_at AS paidAt`) ou dans une fonction de conversion (`toRide()` dans `rides.ts`).

### L'alias `@/`

Dans chaque site, `import { api } from "@/lib/api"` signifie `<site>/src/lib/api.ts`. C'est défini dans le `tsconfig.json` du site (`"paths": { "@/*": ["./src/*"] }`).

## Fichiers de configuration

### `.gitignore` (racine)

| Ligne | Pourquoi l'ignorer |
|---|---|
| `node_modules/` | Se réinstalle avec `npm install` ; très volumineux |
| `.next/`, `out/` | Résultats de compilation de Next.js (s'applique aux deux sites) |
| `next-env.d.ts`, `*.tsbuildinfo` | Générés automatiquement |
| `Backend/data/*.db`, `Backend/data/*.db-*` | La base et ses fichiers temporaires (`-wal`, `-shm`) |
| `.env*.local`, `Backend/.env` | **Secrets** |
| `Application/certificates/` | Certificat https de développement |
| `Backend/data/emails/` | Aperçus d'e-mails générés |

### `Backend/tsconfig.json`

- `"module": "commonjs"`, `"strict": true`, `"noEmit": true` (TypeScript vérifie, `tsx` exécute).
- `"include": ["src", "scripts"]` : les outils de `scripts/` sont vérifiés aussi.

### `tsconfig.json` des sites

- `"jsx": "preserve"` : Next.js transforme le JSX.
- `"moduleResolution": "bundler"` : mode adapté aux outils modernes.
- `"paths"` : l'alias `@/`.

### `next.config.ts` des sites

- `rewrites()` : le relais `/api/*` → Backend (voir [01-vue-d-ensemble.md](01-vue-d-ensemble.md)).
- `outputFileTracingRoot: __dirname` : la racine du site est son propre dossier.

### `postcss.config.mjs`

Branche `@tailwindcss/postcss`, qui génère le CSS des classes Tailwind utilisées.
