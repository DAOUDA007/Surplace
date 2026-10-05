# 2. Arborescence complète

Voici tous les fichiers suivis par git (hors `node_modules` et fichiers générés), avec leur rôle en une ligne. Les fichiers suivants détaillent chaque partie.

```
Surplace/
│
├── package.json            Scripts qui pilotent les deux dossiers (dev, build, start…) + concurrently
├── package-lock.json       Versions exactes installées à la racine (généré par npm, ne pas modifier à la main)
├── README.md               Documentation d'utilisation (démarrage, comptes de démo, règles métier)
├── .gitignore              Ce que git ne doit jamais enregistrer (voir plus bas)
├── node_modules/           Paquets installés à la racine (concurrently) — généré
│
├── Gbê/                    ← Cette documentation
│
├── Backend/                ══════ API Express + SQLite (port 4000) ══════
│   ├── package.json        Dépendances et scripts du Backend (dev, start, typecheck)
│   ├── package-lock.json   Versions exactes (généré)
│   ├── tsconfig.json       Réglages TypeScript du Backend
│   ├── .env.example        Modèle du fichier de secrets (Gmail, adresse du site)
│   ├── .env                (non suivi par git) Vos vrais secrets
│   ├── data/
│   │   ├── .gitkeep        Fichier vide pour que git conserve le dossier
│   │   ├── surplace.db     (non suivi) La base de données, créée au premier lancement
│   │   └── emails/         (non suivi) E-mails enregistrés quand Gmail n'est pas configuré
│   └── src/
│       ├── server.ts       ★ Point d'entrée : crée le serveur, déclare TOUTES les routes /api
│       │
│       │   ── Infrastructure (outils techniques) ──
│       ├── env.ts          Charge Backend/.env dans process.env (importé en tout premier)
│       ├── db.ts           Ouvre SQLite, crée les tables, migre, insère les comptes de démo
│       ├── http.ts         HttpError + route() : transforme résultats et erreurs en réponses JSON
│       ├── validation.ts   Vérifie et nettoie les saisies (téléphone, PIN, e-mail, texte, id)
│       ├── password.ts     Hachage et vérification des codes PIN (scrypt)
│       ├── auth.ts         Sessions par cookie : créer, détruire, lire l'utilisateur connecté
│       ├── events.ts       Bus d'événements temps réel en mémoire (publish / subscribe)
│       ├── mailer.ts       Envoi d'e-mails (Gmail) ou enregistrement en fichier
│       │
│       │   ── Partagés avec le Frontend (copies à garder identiques) ──
│       ├── types.ts        Types de données : User, Ride, DriverProfile, ServerEvent…
│       ├── pricing.ts      Grille tarifaire, formules d'abonnement, calcul distance/prix
│       ├── site.ts         Coordonnées de contact (pour les e-mails) + SITE_URL
│       │
│       │   ── Règles métier (une thématique par fichier) ──
│       ├── rides.ts        Cycle de vie d'une course (création, accepter, arriver, démarrer, terminer, annuler, noter)
│       ├── drivers.ts      Profil chauffeur : en ligne / hors ligne, position GPS, validation
│       ├── subscriptions.ts Abonnements des chauffeurs : demande, paiement, prolongation, expiration
│       ├── accounts.ts     Profil de l'utilisateur, changement de PIN, suppression de comptes, administrateurs
│       ├── admin.ts        Statistiques et listes du tableau de bord, suppressions de contenus
│       ├── public.ts       Avis publics de la page d'accueil, messages du formulaire de contact
│       └── emails/
│           └── welcome.ts  Contenu HTML + texte de l'e-mail de bienvenue (passager / chauffeur)
│
└── Frontend/               ══════ Site Next.js (port 3000) ══════
    ├── package.json        Dépendances et scripts du Frontend
    ├── package-lock.json   Versions exactes (généré)
    ├── tsconfig.json       Réglages TypeScript (dont l'alias @/ → src/)
    ├── next.config.ts      Configuration Next.js : le relais /api/* → Backend
    ├── postcss.config.mjs  Branche Tailwind CSS dans la chaîne de compilation CSS
    ├── next-env.d.ts       (généré, non suivi) Types fournis par Next.js
    ├── .next/              (généré, non suivi) Résultat de la compilation
    └── src/
        ├── app/            ── PAGES : chaque dossier = une adresse du site ──
        │   ├── layout.tsx          Squelette HTML commun à TOUT le site (police, thème, CSS)
        │   ├── globals.css         Styles globaux : couleurs, mode sombre, marqueurs de carte
        │   ├── page.tsx            /                    Page d'accueil publique
        │   ├── (auth)/             Groupe de pages SANS effet sur l'adresse (parenthèses)
        │   │   ├── layout.tsx      Cadre des pages de connexion ; redirige si déjà connecté
        │   │   ├── connexion/page.tsx    /connexion
        │   │   └── inscription/page.tsx  /inscription
        │   ├── passager/
        │   │   ├── page.tsx            /passager             Écran de commande (carte)
        │   │   ├── historique/page.tsx /passager/historique  Mes courses
        │   │   └── profil/page.tsx     /passager/profil      Mon profil
        │   ├── chauffeur/
        │   │   ├── page.tsx            /chauffeur            Écran chauffeur (carte, demandes)
        │   │   ├── historique/page.tsx /chauffeur/historique Mes gains
        │   │   └── profil/page.tsx     /chauffeur/profil     Mon profil
        │   └── admin/
        │       ├── layout.tsx          Vérifie le rôle admin + menu latéral (AdminShell)
        │       ├── page.tsx            /admin                 Vue d'ensemble
        │       ├── courses/page.tsx    /admin/courses
        │       ├── chauffeurs/page.tsx /admin/chauffeurs
        │       ├── passagers/page.tsx  /admin/passagers
        │       ├── abonnements/page.tsx /admin/abonnements
        │       ├── avis/page.tsx       /admin/avis
        │       ├── messages/page.tsx   /admin/messages
        │       ├── administrateurs/page.tsx /admin/administrateurs
        │       └── compte/page.tsx     /admin/compte
        │
        ├── components/     ── BRIQUES D'INTERFACE réutilisables ──
        │   ├── PassengerApp.tsx    ★ Tout l'écran passager (commande, suivi, notation)
        │   ├── DriverApp.tsx       ★ Tout l'écran chauffeur (en ligne, demandes, course, mode démo)
        │   ├── AppShell.tsx        Mise en page plein écran : carte + barre du haut + panneau (Sheet)
        │   ├── AppMenu.tsx         Menu ☰ de l'utilisateur (liens, thème, déconnexion)
        │   ├── MapView.tsx         Charge la carte uniquement dans le navigateur
        │   ├── LeafletMap.tsx      La carte elle-même (marqueurs, trajet, recadrage)
        │   ├── PlaceSearch.tsx     Champ de recherche de lieu avec suggestions
        │   ├── AuthForms.tsx       Formulaires de connexion et d'inscription + cadre AuthShell
        │   ├── ProfilePage.tsx     Page « Mon profil » (assemble les deux formulaires)
        │   ├── ProfileForm.tsx     Formulaire infos (nom, tél, e-mail, moto) + formulaire PIN
        │   ├── RideHistory.tsx     Page liste des courses passées
        │   ├── SubscriptionPanel.tsx Choix / état de l'abonnement du chauffeur
        │   ├── ContactForm.tsx     Formulaire de contact de la page d'accueil
        │   ├── ThemeToggle.tsx     Bouton clair / sombre / auto
        │   ├── Logo.tsx            Logo SURPLACE cliquable
        │   ├── ui.tsx              Petits éléments communs : Button, StatusBadge, ErrorMessage, Route, Stars
        │   └── admin/              Écrans de l'espace administrateur
        │       ├── AdminShell.tsx      Menu latéral + pastilles + en-tête
        │       ├── ui.tsx              Éléments communs admin : Card, StatTile, FilterTabs, ActionButton…
        │       ├── OverviewPage.tsx    Vue d'ensemble (chiffres, carte en direct, graphique 7 jours)
        │       ├── RidesPage.tsx       Courses
        │       ├── DriversPage.tsx     Chauffeurs
        │       ├── PassengersPage.tsx  Passagers
        │       ├── SubscriptionsPage.tsx Abonnements
        │       ├── ReviewsPage.tsx     Avis
        │       ├── MessagesPage.tsx    Messages de contact
        │       ├── AdminsPage.tsx      Administrateurs
        │       └── AccountPage.tsx     Mon compte (admin)
        │
        ├── hooks/          ── LOGIQUE RÉUTILISABLE côté navigateur (fonctions useXxx) ──
        │   ├── useServerEvents.ts  S'abonne au flux temps réel /api/events
        │   ├── useAdminData.ts     Charge et rafraîchit une donnée admin ; exécute une action admin
        │   └── useSheetHeight.ts   Mesure la hauteur du panneau du bas pour recadrer la carte
        │
        └── lib/            ── OUTILS SANS INTERFACE ──
            ├── api.ts          api() : appel JSON vers /api depuis le navigateur
            ├── server.ts       backendGet(), getSession(), requirePageUser() : appels depuis le serveur Next
            ├── types.ts        Types partagés (copie du Backend + types propres à l'admin)
            ├── pricing.ts      Copie EXACTE de Backend/src/pricing.ts
            ├── site.ts         Coordonnées de contact affichées sur l'accueil + sujets du formulaire
            ├── places.ts       Korhogo : centre, lieux fréquents, recherche Nominatim
            ├── geolocation.ts  Localisation GPS précise + messages d'erreur compréhensibles
            ├── format.ts       Libellés et couleurs des statuts, formats de date et de téléphone
            └── theme.ts        Clé de stockage du thème + script anti-« flash »
```

## Pourquoi cette organisation ?

### Racine : un « chef d'orchestre » léger

La racine ne contient pas de code applicatif. Son `package.json` sert uniquement à lancer les deux programmes ensemble. C'est ce qu'on appelle un **monorepo** simple : un seul dépôt git, plusieurs projets indépendants.

### Backend : à plat, un fichier par sujet

Le Backend est petit (~2 000 lignes) : tous les fichiers sont dans `src/` sans sous-dossiers (sauf `emails/`). On distingue trois couches :

1. **`server.ts`** : la porte d'entrée. Chaque route y est courte : elle vérifie qui appelle (`requireUser`), puis délègue à une fonction métier.
2. **Les fichiers métier** (`rides.ts`, `drivers.ts`, `subscriptions.ts`, `accounts.ts`, `admin.ts`, `public.ts`) : les règles et les requêtes SQL.
3. **L'infrastructure** (`db.ts`, `auth.ts`, `http.ts`, `events.ts`, `mailer.ts`, `validation.ts`, `password.ts`, `env.ts`) : les outils techniques dont les règles ont besoin.

Avantage : pour comprendre « comment une course est acceptée », on ouvre `rides.ts` ; pour « qui a le droit d'appeler », on ouvre `server.ts`.

### Frontend : la structure imposée par Next.js

- **`src/app/`** : Next.js transforme automatiquement chaque dossier contenant un `page.tsx` en adresse du site. Les fichiers de `app/` sont volontairement **très courts** : ils vérifient l'accès puis affichent un composant de `components/`.
- **`src/components/`** : là où se trouve le vrai travail d'interface. Séparer page et composant permet de réutiliser un composant sur plusieurs pages (ex. `ProfilePage` sert pour `/passager/profil` et `/chauffeur/profil`).
- **`src/hooks/`** : la logique React réutilisable (connexion temps réel, chargement des données admin).
- **`src/lib/`** : les fonctions « pures » sans interface (calculs, formats, appels réseau).

### Les dossiers spéciaux de Next.js

| Écriture | Signification | Exemple ici |
|---|---|---|
| `page.tsx` | Le contenu d'une adresse | `app/passager/page.tsx` → `/passager` |
| `layout.tsx` | Un cadre qui entoure toutes les pages du dossier et de ses sous-dossiers | `app/admin/layout.tsx` entoure toutes les pages `/admin/...` |
| `(nom)/` | **Groupe de routes** : sert à partager un `layout.tsx` sans apparaître dans l'adresse | `app/(auth)/connexion` → `/connexion` (et non `/auth/connexion`) |

## Conventions de nommage

| Élément | Convention | Exemples |
|---|---|---|
| Adresses du site | **Français** (ce que voient les utilisateurs) | `/passager`, `/chauffeur/historique`, `/admin/abonnements` |
| Code (variables, fonctions, fichiers) | **Anglais** | `createRide`, `DriverApp.tsx`, `subscriptions.ts` |
| Textes affichés, commentaires | **Français** | `"Votre chauffeur est arrivé !"` |
| Composants React | `PascalCase`, un fichier `.tsx` | `PassengerApp`, `LeafletMap` |
| Hooks React | commencent par `use` | `useServerEvents`, `useAdminData` |
| Constantes de configuration | `MAJUSCULES` | `PRICING`, `REQUEST_TIMEOUT_MIN`, `CITY_CENTER` |
| Colonnes SQL | `snake_case` | `pickup_lat`, `subscription_until` |
| Champs JSON / TypeScript | `camelCase` | `requestedAt`, `motoModel`, `subscriptionUntil` |

Le passage de `snake_case` (base) à `camelCase` (JSON) se fait dans le Backend, soit avec `AS` dans le SQL (`paid_at AS paidAt`), soit dans une fonction de conversion (`toRide()` dans `rides.ts`).

### L'alias `@/`

Dans le Frontend, `import { api } from "@/lib/api"` signifie `Frontend/src/lib/api.ts`. C'est défini dans `Frontend/tsconfig.json` (`"paths": { "@/*": ["./src/*"] }`). Cela évite les chemins du type `../../../lib/api`.

## Fichiers de configuration

### `.gitignore` (racine)

| Ligne | Pourquoi l'ignorer |
|---|---|
| `node_modules/` | Se réinstalle avec `npm install` ; très volumineux |
| `.next/`, `out/` | Résultats de compilation de Next.js |
| `next-env.d.ts`, `*.tsbuildinfo` | Générés automatiquement |
| `Backend/data/*.db`, `Backend/data/*.db-*` | La base et ses fichiers temporaires (`-wal`, `-shm`) : données réelles, pas du code |
| `.env*.local`, `Backend/.env` | **Secrets** (mot de passe Gmail) |
| `Frontend/certificates/` | Certificat https de développement |
| `Backend/data/emails/` | Aperçus d'e-mails générés |

### `Backend/tsconfig.json`

- `"module": "commonjs"` : format de modules classique de Node.
- `"strict": true` : vérifications TypeScript maximales.
- `"noEmit": true` : TypeScript ne génère aucun fichier ; il sert seulement à vérifier. C'est `tsx` qui exécute.

### `Frontend/tsconfig.json`

- `"jsx": "preserve"` : Next.js s'occupe de transformer le JSX.
- `"moduleResolution": "bundler"` : mode adapté aux outils de compilation modernes.
- `"paths"` : l'alias `@/`.

### `Frontend/next.config.ts`

- `rewrites()` : le relais `/api/*` → Backend (voir [01-vue-d-ensemble.md](01-vue-d-ensemble.md)).
- `outputFileTracingRoot: __dirname` : indique à Next.js que la racine du projet Frontend est ce dossier (sinon il pourrait remonter à `Surplace/` à cause du `package-lock.json` de la racine).

### `Frontend/postcss.config.mjs`

Branche le plugin `@tailwindcss/postcss` : c'est lui qui lit les classes Tailwind utilisées dans vos fichiers et génère le CSS correspondant.
