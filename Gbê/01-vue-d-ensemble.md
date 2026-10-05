# 1. Vue d'ensemble

## Ce que fait l'application

SURPLACE est une application web de **taxi-moto à Korhogo** (Côte d'Ivoire). Elle a trois types d'utilisateurs, appelés **rôles** dans le code :

| Rôle (code) | Qui | Ce qu'il fait | Adresse |
|---|---|---|---|
| `passenger` | Passager | Choisit un départ et une destination, voit le prix, commande, suit la moto, paie en espèces, note le chauffeur | `/passager` |
| `driver` | Chauffeur | Passe en ligne, voit les demandes proches, accepte, avance la course étape par étape, paie un abonnement | `/chauffeur` |
| `admin` | Administrateur | Valide les chauffeurs, encaisse les abonnements, surveille les courses, modère avis et messages | `/admin` |

Il y a aussi une **page d'accueil publique** (`/`) avec présentation, avis des clients et formulaire de contact.

**Modèle économique** : aucune commission sur les courses. Le chauffeur paie un **abonnement** (1 000 FCFA/mois ou 10 000 FCFA/an) pour avoir le droit de travailler.

## Les trois étages

Le projet est découpé en deux programmes distincts qui tournent en même temps, plus le navigateur de l'utilisateur.

```
┌──────────────────────────┐
│ 1. NAVIGATEUR            │  Ce que voit l'utilisateur : pages, carte, boutons.
│    (téléphone / PC)      │  Exécute le code des composants marqués "use client".
└────────────┬─────────────┘
             │  http://localhost:3000/...        (pages)
             │  http://localhost:3000/api/...    (données)
             ▼
┌──────────────────────────┐
│ 2. FRONTEND  (Next.js)   │  Dossier Frontend/  —  port 3000
│                          │  • construit les pages HTML (composants serveur)
│                          │  • relaie toutes les requêtes /api/* vers le Backend
└────────────┬─────────────┘
             │  http://localhost:4000/api/...
             ▼
┌──────────────────────────┐
│ 3. BACKEND   (Express)   │  Dossier Backend/  —  port 4000
│                          │  • vérifie qui est connecté et ce qu'il a le droit de faire
│                          │  • applique les règles (prix, étapes d'une course, abonnements…)
│                          │  • envoie les événements temps réel
└────────────┬─────────────┘
             ▼
┌──────────────────────────┐
│ BASE DE DONNÉES SQLite   │  Un seul fichier : Backend/data/surplace.db
└──────────────────────────┘
```

### Pourquoi séparer Frontend et Backend ?

- **Responsabilités claires** : le Frontend ne s'occupe que de l'affichage. Toutes les décisions importantes (le prix réel d'une course, le droit d'accepter une course, la validité d'un PIN…) sont prises par le Backend. Un utilisateur malin peut modifier le code qui tourne dans son navigateur, mais pas le Backend.
- **Un seul gardien des données** : seul le Backend touche à la base SQLite. Le Frontend n'a même pas la bibliothèque SQLite installée.
- **Évolution** : on pourrait demain écrire une application mobile qui parle au même Backend sans rien changer à celui-ci.

### Pourquoi le Frontend relaie `/api/*` (le « proxy ») ?

Dans `Frontend/next.config.ts`, une règle `rewrites()` dit : *« toute requête vers `/api/quelque-chose` sur le port 3000, renvoie-la vers `BACKEND_URL/api/quelque-chose` »*.

Conséquence : le navigateur ne connaît **qu'une seule adresse** (celle du site). C'est important pour le **cookie de session** : un cookie est attaché à un domaine. Si le navigateur parlait directement au port 4000, le cookie posé par le Backend ne serait pas renvoyé avec les pages du port 3000, et il faudrait gérer le CORS (autorisations entre domaines). Le proxy évite tous ces problèmes.

## Les technologies et pourquoi elles sont là

### Communes

| Outil | Rôle | Pourquoi |
|---|---|---|
| **TypeScript** | JavaScript avec des types | Les erreurs (champ mal orthographié, mauvais type) sont détectées dans l'éditeur avant l'exécution. Tout le projet est en `.ts` / `.tsx`. |
| **Node.js 22** | Fait tourner le JavaScript hors du navigateur | Requis par les deux dossiers. `process.loadEnvFile` (utilisé dans `env.ts`) n'existe que depuis Node 21. |
| **npm** | Gestionnaire de paquets | Chaque dossier a son `package.json` et son `node_modules`. |
| **concurrently** (racine) | Lance plusieurs commandes à la fois | `npm run dev` à la racine démarre le Backend et le Frontend dans le même terminal, avec des couleurs (`api` en bleu, `web` en magenta). |

### Backend (`Backend/package.json`)

| Outil | Rôle | Pourquoi |
|---|---|---|
| **Express 4** | Serveur HTTP : reçoit les requêtes et y répond | Simple, très répandu, beaucoup de documentation. |
| **better-sqlite3** | Accès à la base SQLite | SQLite = une base de données complète dans un seul fichier, sans serveur à installer. `better-sqlite3` est **synchrone** (pas de `await`), ce qui rend le code des règles métier plus simple à lire. |
| **cookie-parser** | Lit les cookies des requêtes | Pour retrouver le jeton de session `surplace_session`. |
| **nodemailer** | Envoi d'e-mails (SMTP Gmail) | Pour l'e-mail de bienvenue. |
| **tsx** | Exécute directement du TypeScript | Pas d'étape de compilation : `tsx watch src/server.ts` redémarre le serveur à chaque sauvegarde. |
| **typescript** + `@types/...` | Vérification des types | `npm run typecheck` dans `Backend/`. Les paquets `@types/*` décrivent les types des bibliothèques. |

### Frontend (`Frontend/package.json`)

| Outil | Rôle | Pourquoi |
|---|---|---|
| **Next.js 15** | Framework React avec routage par dossiers | Une page = un dossier dans `src/app/`. Permet de préparer les pages côté serveur (plus rapide, la session est vérifiée avant l'affichage). |
| **React 19** | Bibliothèque d'interface | Construit l'écran à partir de composants et d'états (`useState`). |
| **Turbopack** | Compilateur de développement de Next.js | Activé par `next dev --turbopack` : recompile vite à chaque modification. |
| **Tailwind CSS 4** | Styles par classes utilitaires | On écrit `className="rounded-2xl bg-surface p-4"` au lieu de fichiers CSS séparés. Configuré dans `globals.css` et `postcss.config.mjs`. |
| **Leaflet** + **react-leaflet** | Carte interactive | Gratuit, fonctionne avec les tuiles OpenStreetMap (pas de clé API ni de facturation, contrairement à Google Maps). |
| **server-only** | Garde-fou | Importé dans `lib/server.ts` : si ce fichier se retrouvait par erreur dans le code envoyé au navigateur, la compilation échouerait. |

### Services externes (gratuits, sans clé)

| Service | Utilisé dans | Rôle |
|---|---|---|
| Tuiles **OpenStreetMap** | `components/LeafletMap.tsx` | Les images de la carte |
| **Nominatim** (OpenStreetMap) | `lib/places.ts` | Recherche d'adresse (« géocodage ») et nom d'un point touché sur la carte (« géocodage inverse ») |
| **Google Fonts** (Plus Jakarta Sans) | `app/layout.tsx` | Police du site, téléchargée par Next.js au moment de la compilation |
| **Gmail SMTP** (facultatif) | `Backend/src/mailer.ts` | Envoi réel des e-mails |

## Démarrer le projet

```bash
npm install            # à la racine : installe concurrently
npm run install:all    # installe Backend/node_modules et Frontend/node_modules
npm run dev            # lance l'API (4000) et le site (3000)
```

Les scripts de la racine (`package.json`) :

| Script | Ce qu'il fait |
|---|---|
| `install:all` | `npm install` dans `Backend/` puis dans `Frontend/` |
| `dev` | Backend en mode surveillance (`tsx watch`) + Frontend en mode développement |
| `dev:https` | Pareil, mais le Frontend en **https** avec un certificat auto-signé. Utile pour tester le **GPS depuis un téléphone** sur le réseau local : les navigateurs refusent la géolocalisation en http (sauf sur `localhost`). Le certificat est créé dans `Frontend/certificates/` (ignoré par git). |
| `build` | Compile le Frontend pour la production (`next build`) |
| `start` | Lance la version de production des deux serveurs |

## Variables d'environnement

| Variable | Lue par | Défaut | Rôle |
|---|---|---|---|
| `PORT` | `Backend/src/server.ts` | `4000` | Port de l'API |
| `SURPLACE_DB` | `Backend/src/db.ts` | `Backend/data/surplace.db` | Chemin du fichier SQLite |
| `SMTP_USER`, `SMTP_PASS` | `Backend/src/mailer.ts` | vide | Identifiants Gmail. Vides = e-mails enregistrés en fichiers au lieu d'être envoyés |
| `SMTP_HOST`, `SMTP_PORT` | `Backend/src/mailer.ts` | `smtp.gmail.com`, `465` | Serveur d'envoi |
| `MAIL_FROM_NAME` | `Backend/src/mailer.ts` | `SURPLACE` | Nom de l'expéditeur |
| `SITE_URL` | `Backend/src/site.ts` | `http://localhost:3000` | Adresse publique, pour les liens dans les e-mails |
| `BACKEND_URL` | `Frontend/next.config.ts` et `Frontend/src/lib/server.ts` | `http://localhost:4000` | Où trouver l'API |
| `NODE_ENV` | les deux | `development` en dev, `production` après build | Active le cookie `secure`, cache les comptes de démo, désactive le mode démo chauffeur |

Les variables du Backend se mettent dans `Backend/.env` (modèle : `Backend/.env.example`). Ce fichier contient des secrets : il est exclu de git par `.gitignore`.

> ⚠️ `BACKEND_URL` est lu par `next.config.ts` **au moment du `next build`**. En production, définissez-le avant la compilation.
