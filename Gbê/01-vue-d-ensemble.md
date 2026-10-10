# 1. Vue d'ensemble

## Ce que fait l'application

SURPLACE est une application web de **taxi-moto à Korhogo** (Côte d'Ivoire). Elle a trois types d'utilisateurs, appelés **rôles** dans le code :

| Rôle (code) | Qui | Ce qu'il fait | Où |
|---|---|---|---|
| `passenger` | Passager | Choisit un départ et une destination, voit le prix, commande (**avec ou sans compte**), suit la moto, paie en espèces, note le chauffeur | Application — `/passager` |
| `driver` | Chauffeur | S'inscrit avec sa moto et son **permis**, passe en ligne, voit les demandes proches, accepte, avance la course étape par étape, paie un abonnement | Application — `/chauffeur` |
| `admin` | Administrateur | Valide les chauffeurs, encaisse les abonnements, surveille les courses, modère avis et messages | **Administration** (site séparé) |

Il y a aussi une **page d'accueil publique** (`/` de l'Application) avec présentation, avis des clients et formulaire de contact.

**Commande sans compte** : un visiteur peut commander directement. Au moment de commander, il donne seulement son nom et son numéro ; il devient un **passager invité**, reconnu sur son téléphone. Il peut plus tard créer son compte (code PIN) en gardant ses courses.

**Modèle économique** : aucune commission sur les courses. Le chauffeur paie un **abonnement** (1 000 FCFA/mois ou 10 000 FCFA/an) pour avoir le droit de travailler.

## Les étages de l'application

Le projet est découpé en **trois programmes** qui tournent en même temps, plus le navigateur de l'utilisateur.

```
┌────────────────────────┐                 ┌────────────────────────┐
│ NAVIGATEUR des clients │                 │ NAVIGATEUR de l'équipe │
│ (passagers, chauffeurs)│                 │ (administrateurs)      │
└───────────┬────────────┘                 └───────────┬────────────┘
            │ http://localhost:3000                    │ http://localhost:3001
            ▼                                          ▼
┌────────────────────────┐                 ┌────────────────────────┐
│ APPLICATION (Next.js)  │                 │ ADMINISTRATION (Next.js)│
│ dossier Application/   │                 │ dossier Administration/ │
│ accueil, passagers,    │                 │ tableau de bord,        │
│ chauffeurs             │                 │ connexion admin         │
└───────────┬────────────┘                 └───────────┬────────────┘
            │  /api/*  relayé                          │  /api/*  relayé
            └──────────────────┬───────────────────────┘
                               ▼
                  ┌────────────────────────┐
                  │ BACKEND (Express)      │  dossier Backend/ — port 4000
                  │ règles, sécurité,      │
                  │ temps réel             │
                  └───────────┬────────────┘
                              ▼
                  ┌────────────────────────┐
                  │ SQLite                 │  Backend/data/surplace.db
                  └────────────────────────┘
```

### Pourquoi séparer Backend et sites ?

- **Responsabilités claires** : les sites ne s'occupent que de l'affichage. Toutes les décisions importantes (prix réel d'une course, droit d'accepter une course, validité d'un PIN…) sont prises par le Backend. Un utilisateur malin peut modifier le code qui tourne dans son navigateur, mais pas le Backend.
- **Un seul gardien des données** : seul le Backend touche à la base SQLite.
- **Évolution** : une application mobile pourrait demain parler au même Backend.

### Pourquoi deux sites ?

Voir [02-arborescence.md](02-arborescence.md) : sécurité (l'admin peut avoir sa propre adresse protégée), légèreté du site client, indépendance des mises à jour.

La connexion est **cloisonnée** : un administrateur ne peut se connecter que sur l'Administration, un passager ou un chauffeur que sur l'Application. C'est le Backend qui l'impose (paramètre `space` de `/api/auth/login`).

### Pourquoi chaque site relaie `/api/*` (le « proxy ») ?

Dans le `next.config.ts` de chaque site, une règle `rewrites()` dit : *« toute requête vers `/api/quelque-chose`, renvoie-la vers `BACKEND_URL/api/quelque-chose` »*.

Le navigateur ne connaît donc **qu'une seule adresse** (celle du site qu'il visite). C'est important pour le **cookie de session** : un cookie est attaché à un domaine. Le proxy évite aussi toute configuration CORS (autorisations entre domaines).

## Les technologies et pourquoi elles sont là

### Communes

| Outil | Rôle | Pourquoi |
|---|---|---|
| **TypeScript** | JavaScript avec des types | Les erreurs sont détectées dans l'éditeur avant l'exécution. |
| **Node.js 22** | Fait tourner le JavaScript hors du navigateur | Requis partout. `process.loadEnvFile` (dans `env.ts`) n'existe que depuis Node 21. |
| **npm** | Gestionnaire de paquets | Chaque projet a son `package.json` et son `node_modules`. |
| **concurrently** (racine) | Lance plusieurs commandes à la fois | `npm run dev` démarre les trois projets dans le même terminal (`api` bleu, `app` magenta, `admin` vert). |

### Backend (`Backend/package.json`)

| Outil | Rôle | Pourquoi |
|---|---|---|
| **Express 4** | Serveur HTTP | Simple, très répandu. |
| **better-sqlite3** | Accès à SQLite | Base dans un seul fichier, sans serveur. API **synchrone**, donc code métier simple. |
| **cookie-parser** | Lit les cookies | Pour retrouver le jeton de session `surplace_session`. |
| **nodemailer** | Envoi d'e-mails (Gmail) | E-mail de bienvenue. |
| **tsx** | Exécute directement du TypeScript | `tsx watch` redémarre le serveur à chaque sauvegarde. |
| **typescript** + `@types/...` | Vérification des types | `npm run typecheck`. |

### Application et Administration (`package.json` de chaque site)

| Outil | Rôle | Pourquoi |
|---|---|---|
| **Next.js 15** | Framework React avec routage par dossiers | Une page = un dossier dans `src/app/`. Les pages sont préparées côté serveur (session vérifiée avant l'affichage). |
| **React 19** | Bibliothèque d'interface | Composants et états (`useState`). |
| **Turbopack** | Compilateur de développement | `next dev --turbopack`. |
| **Tailwind CSS 4** | Styles par classes utilitaires | `className="rounded-2xl bg-surface p-4"`. |
| **Leaflet** + **react-leaflet** | Carte interactive | Gratuit, tuiles OpenStreetMap (pas de clé API). |
| **server-only** | Garde-fou | Empêche `lib/server.ts` de finir dans le code envoyé au navigateur. |

### Services externes (gratuits, sans clé)

| Service | Utilisé dans | Rôle |
|---|---|---|
| Tuiles **OpenStreetMap** | `components/LeafletMap.tsx` (deux sites) | Les images de la carte |
| **Nominatim** | `Application/src/lib/places.ts` | Recherche d'adresse et nom d'un point touché sur la carte |
| **Google Fonts** (Plus Jakarta Sans) | `app/layout.tsx` (deux sites) | Police, téléchargée à la compilation |
| **Gmail SMTP** (facultatif) | `Backend/src/mailer.ts` | Envoi réel des e-mails |

## Démarrer le projet

```bash
npm install            # à la racine : installe concurrently
npm run install:all    # installe Backend, Application et Administration
npm run dev            # API (4000) + Application (3000) + Administration (3001)
```

| Script (racine) | Ce qu'il fait |
|---|---|
| `install:all` | `npm install` dans les trois projets |
| `dev` | Les trois en mode développement |
| `dev:https` | Pareil, mais l'Application en **https** (certificat auto-signé dans `Application/certificates/`). Utile pour tester le **GPS depuis un téléphone** sur le réseau local : les navigateurs refusent la géolocalisation en http (sauf sur `localhost`). |
| `build` | Compile les deux sites pour la production |
| `start` | Lance la version de production des trois programmes |

Script du Backend : `npm run reset-admin-pin -- 4821` (dans `Backend/`) donne un nouveau code PIN à l'administrateur principal (PIN oublié).

## Variables d'environnement

| Variable | Lue par | Défaut | Rôle |
|---|---|---|---|
| `PORT` | `Backend/src/server.ts` | `4000` | Port de l'API |
| `SURPLACE_DB` | `Backend/src/db.ts` | `Backend/data/surplace.db` | Chemin du fichier SQLite |
| `SMTP_USER`, `SMTP_PASS` | `Backend/src/mailer.ts` | vide | Identifiants Gmail. Vides = e-mails enregistrés en fichiers |
| `SMTP_HOST`, `SMTP_PORT` | `Backend/src/mailer.ts` | `smtp.gmail.com`, `465` | Serveur d'envoi |
| `MAIL_FROM_NAME` | `Backend/src/mailer.ts` | `SURPLACE` | Nom de l'expéditeur |
| `SITE_URL` | `Backend/src/site.ts` | `http://localhost:3000` | Adresse publique, pour les liens dans les e-mails |
| `BACKEND_URL` | `next.config.ts` et `lib/server.ts` des **deux sites** | `http://localhost:4000` | Où trouver l'API |
| `ADMIN_URL` | `Application/src/lib/server.ts` | `http://localhost:3001` | Où renvoyer un administrateur qui arrive sur l'Application |
| `NODE_ENV` | partout | `development` en dev, `production` après build | Cookie `secure`, comptes de démo cachés, mode démo chauffeur désactivé |

Les variables du Backend se mettent dans `Backend/.env` (modèle : `Backend/.env.example`), exclu de git.

> ⚠️ `BACKEND_URL` est lu par `next.config.ts` **au moment du `next build`**. En production, définissez-le avant la compilation.
