# 2. Arborescence complète

Tous les fichiers du projet (hors `node_modules` et fichiers générés), avec leur rôle en une ligne. Les fichiers suivants détaillent chaque partie.

```
Surplace/
│
├── package.json            Scripts qui pilotent les trois projets (dev, build, start, test, sync) + concurrently
├── README.md               Mode d'emploi (démarrage, comptes de démo, règles métier)
├── .gitignore              Ce que git ne doit jamais enregistrer
│
├── Gbê/                    ← Cette documentation
├── deploy/                 Mise en ligne : DEPLOIEMENT.md (guide), ecosystem.config.cjs (PM2), nginx.conf (HTTPS)
├── scripts/
│   └── sync-commun.mjs     Recopie les fichiers de Commun/ dans les trois projets (ou les vérifie avec --check)
│
├── Commun/                 ══════ SEULE version des fichiers partagés (voir plus bas) ══════
│   ├── LISEZMOI.md
│   ├── lib/                types, pricing, site, permissions, format, theme, api, places, preferences, push
│   ├── components/         Logo, ThemeToggle, MapView, LeafletMap, ui, ProfileForm, PwaSetup, OtpField, PinResetForm
│   ├── hooks/              useServerEvents (temps réel), usePublicConfig (tarifs, lieux, options)
│   ├── styles/globals.css  Couleurs, mode sombre, mode simple, marqueurs, défilement
│   └── public/             sw.js (notifications push, page hors connexion), icônes de l'application installable
│
├── Backend/                ══════ API Express + SQLite (port 4000) ══════
│   ├── package.json        Scripts : dev, start, typecheck, test, reset-admin-pin, backup
│   ├── tsconfig.json       Vérifie src/, scripts/ et tests/
│   ├── .env.example        Modèle des secrets : Gmail, SMS Orange, push, OSRM, adresses
│   ├── data/               (non suivi) base, sauvegardes, photos de documents, SMS de test, clés push
│   ├── scripts/            reset-admin-pin.ts (PIN admin oublié), backup.ts (sauvegarde manuelle)
│   ├── tests/api.test.ts   17 tests automatiques des parcours (npm test)
│   └── src/
│       ├── server.ts       Démarrage : écoute le port 4000, lance les tâches de fond
│       ├── app.ts          ★ Toutes les routes /api (Express)
│       │
│       │   ── Infrastructure ──
│       ├── env.ts, config.ts   Lecture de Backend/.env (adresses, mode production)
│       ├── db.ts           SQLite : tables, migrations, comptes de démo, lieux de départ
│       ├── http.ts         HttpError + route() (réponses JSON, erreurs)
│       ├── validation.ts   Saisies : téléphone, PIN, e-mail, permis, texte, identifiant
│       ├── password.ts     Hachage des PIN (et des codes SMS)
│       ├── auth.ts         Sessions, utilisateur connecté, droits des administrateurs
│       ├── limits.ts       Limites anti-abus (tentatives de connexion, SMS, requêtes…)
│       ├── events.ts       Bus temps réel en mémoire
│       ├── mailer.ts, emails/welcome.ts   E-mails
│       ├── sms.ts, otp.ts  SMS (Orange ou console) et codes de vérification
│       ├── push.ts         Notifications push (web-push)
│       ├── notifications.ts Notifications 🔔 + push + SMS, messages groupés
│       ├── backup.ts       Sauvegardes quotidiennes
│       ├── jobs.ts         Tâches de fond : attribution, rappels, sauvegardes, ménage
│       ├── audit.ts        Journal des actions des administrateurs
│       ├── settings.ts     Tarifs et réglages modifiables depuis l'administration
│       │
│       │   ── Copiés depuis Commun/ (ne pas modifier ici) ──
│       ├── types.ts, pricing.ts, site.ts, permissions.ts
│       │
│       │   ── Règles métier ──
│       ├── rides.ts        Courses : création, étapes, réservations, pour un proche, notes, partage
│       ├── dispatch.ts     Attribution automatique au chauffeur le plus proche
│       ├── routing.ts      Distance et prix (itinéraire OSRM ou ligne droite × facteur)
│       ├── drivers.ts      En ligne, position, validation, heures en ligne
│       ├── documents.ts    Documents des chauffeurs (photos, expiration)
│       ├── subscriptions.ts Abonnements (prix réglables, prolongation, jours offerts)
│       ├── referrals.ts    Parrainage entre chauffeurs (jours d'abonnement)
│       ├── accounts.ts     Profils, PIN, PIN oublié, invités, suppression, administrateurs et rôles
│       ├── alerts.ts       Bouton d'urgence 🆘
│       ├── complaints.ts   Réclamations
│       ├── places.ts       Lieux fréquents, favoris, dernières destinations
│       ├── stats.ts        Statistiques des chauffeurs, zones demandées
│       ├── reports.ts      Rapport mensuel, exports CSV
│       ├── admin.ts        Pastilles, vue d'ensemble, listes, suppressions
│       └── public.ts       Avis publics, formulaire de contact
│
├── Application/            ══════ Site public, passagers et chauffeurs — Next.js (port 3000) ══════
│   ├── public/             (copiés) sw.js, icônes ; annonces/ : fichiers audio en dioula et sénoufo (à enregistrer)
│   └── src/
│       ├── app/
│       │   ├── layout.tsx          Squelette HTML, thème, mode simple, PwaSetup
│       │   ├── manifest.ts         Application installable (nom, icônes, couleurs)
│       │   ├── page.tsx            /                      Accueil (tarifs réels, « Comment ça marche »…)
│       │   ├── (auth)/             /connexion, /inscription (code SMS, parrainage), /pin-oublie
│       │   ├── passager/           /passager (ouvert à tous), /passager/historique, /passager/profil
│       │   ├── chauffeur/          /chauffeur, /chauffeur/historique (gains et statistiques), /chauffeur/profil (documents)
│       │   ├── notifications/      /notifications         La cloche 🔔
│       │   └── suivi/[token]/      /suivi/…               Suivi en direct pour un proche (sans compte)
│       ├── components/
│       │   ├── PassengerApp.tsx    ★ Écran passager : prix serveur, favoris, réservation, pour un proche, invité + SMS, partage, urgence
│       │   ├── DriverApp.tsx       ★ Écran chauffeur : propositions avec compte à rebours, son, écran allumé, batterie, zones, note du passager
│       │   ├── AppShell.tsx, AppMenu.tsx   Carte plein écran ; menu ☰ (cloche, réglages, installation)
│       │   ├── PlaceSearch.tsx     Recherche de lieu (favoris, lieux fréquents, Nominatim)
│       │   ├── AuthForms.tsx       Connexion, inscription
│       │   ├── ProfilePage.tsx, DocumentsPanel.tsx, ReferralCard.tsx   Profil, documents, parrainage
│       │   ├── RideHistory.tsx, ComplaintButton.tsx   Historique, « Signaler un problème »
│       │   ├── EmergencyButton.tsx, ShareRideButton.tsx, DriverPhoto.tsx, TrackView.tsx
│       │   ├── NotificationsList.tsx, SubscriptionPanel.tsx, ContactForm.tsx
│       │   └── (copiés) Logo, ThemeToggle, MapView, LeafletMap, ui, ProfileForm, PwaSetup, OtpField, PinResetForm
│       ├── hooks/              useSheetHeight ; (copiés) useServerEvents, usePublicConfig
│       └── lib/                server.ts, geolocation.ts ; (copiés) types, pricing, site, format, theme, api, places, preferences, push
│
└── Administration/         ══════ Espace d'administration — Next.js (port 3001) ══════
    └── src/
        ├── app/
        │   ├── layout.tsx, manifest.ts     Squelette (non indexé par Google), installable
        │   ├── connexion/, pin-oublie/     Connexion réservée aux admins, PIN oublié par SMS
        │   └── (espace)/                   Pages qui exigent un admin connecté :
        │       /  /alertes  /courses  /chauffeurs  /passagers  /abonnements  /rapports  /reclamations
        │       /avis  /messages  /diffusion  /reglages  /lieux  /administrateurs  /journal  /systeme  /compte
        ├── components/
        │   ├── LoginForm.tsx
        │   ├── admin/              AdminShell (menu filtré par rôle, alarme d'urgence), un écran par page
        │   └── (copiés)            Logo, ThemeToggle, MapView, LeafletMap, ui, ProfileForm, PwaSetup, OtpField, PinResetForm
        ├── hooks/                  useAdminData ; (copiés) useServerEvents, usePublicConfig
        └── lib/                    server.ts (getAdmin, requireAdmin) ; (copiés) types, pricing, permissions…
```

## Pourquoi cette organisation ?

### Trois programmes, un dossier commun

| Dossier | Public | Pourquoi séparé |
|---|---|---|
| `Backend/` | Aucun (serveur) | Seul à toucher aux données et à décider (prix, droits, sécurité). |
| `Application/` | Clients (passagers, chauffeurs) | Léger, rapide sur téléphone, installable. |
| `Administration/` | Équipe SURPLACE | Adresse à part, protégeable (liste d'IP), code jamais envoyé aux clients. |
| `Commun/` | — | **Une seule version** des fichiers utilisés par plusieurs projets. |

### Le dossier `Commun/` et la synchronisation

Les trois projets ont chacun leur `package.json` : ils ne peuvent pas importer facilement un dossier extérieur. Plutôt qu'un système de paquets partagés (plus compliqué à installer), chaque fichier partagé est **recopié** dans les projets qui l'utilisent par `scripts/sync-commun.mjs`.

- On modifie **toujours** l'original dans `Commun/`.
- Les copies portent en première ligne « ⚠️ Fichier copié depuis Commun/… ».
- La copie est automatique avant chaque `npm run dev`, `npm run build` et `npm start` (scripts `predev`, `prebuild`, `prestart` de chaque projet). À la main : `npm run sync` à la racine.
- `node scripts/sync-commun.mjs --check` vérifie qu'aucune copie n'a été modifiée par erreur ; les tests du Backend le font aussi.

La liste « fichier → dossiers de destination » est en haut de `scripts/sync-commun.mjs`.

### Backend : un fichier par sujet

1. **`app.ts`** : les routes. Chacune vérifie qui appelle, puis délègue à une fonction métier.
2. **Les fichiers métier** : les règles et les requêtes SQL, un sujet par fichier.
3. **L'infrastructure** : base, sessions, limites, SMS, push, sauvegardes, tâches de fond.

### Sites Next.js

- **`src/app/`** : chaque dossier avec un `page.tsx` devient une adresse. Fichiers très courts.
- **`src/components/`** : les écrans.
- **`src/hooks/`** et **`src/lib/`** : logique réutilisable et outils sans interface.

| Écriture | Signification | Exemple |
|---|---|---|
| `page.tsx` | Le contenu d'une adresse | `Application/src/app/passager/page.tsx` → `/passager` |
| `layout.tsx` | Cadre commun aux pages du dossier | `Administration/src/app/(espace)/layout.tsx` |
| `(nom)/` | Groupe de routes (absent de l'adresse) | `(espace)/courses` → `/courses` |
| `[nom]/` | Partie variable de l'adresse | `suivi/[token]` → `/suivi/AbC123…` |
| `manifest.ts`, `icon.png` | Fichiers spéciaux détectés par Next.js | application installable, icône d'onglet |

## Conventions de nommage

| Élément | Convention | Exemples |
|---|---|---|
| Adresses du site | **Français** | `/passager`, `/pin-oublie`, `/reglages` |
| Code (variables, fonctions, fichiers) | **Anglais** | `createRide`, `dispatchTick`, `DocumentsPanel.tsx` |
| Textes affichés, commentaires | **Français** | `"Course proposée pour vous"` |
| Composants React | `PascalCase` | `EmergencyButton` |
| Hooks React | `useXxx` | `usePublicConfig` |
| Constantes | `MAJUSCULES` | `DEFAULT_SETTINGS`, `REQUIRED_DOCUMENTS` |
| Colonnes SQL | `snake_case` | `scheduled_at`, `offer_expires_at` |
| Champs JSON / TypeScript | `camelCase` | `scheduledAt`, `offerExpiresAt` |

L'alias **`@/`** (`tsconfig.json` de chaque site) désigne le dossier `src/` du site : `@/lib/api` = `src/lib/api.ts`.

## Fichiers de configuration

- **`.gitignore`** : `node_modules/`, `.next/`, la base et tout `Backend/data/` sensible (sauvegardes, photos de documents, SMS, clés push), les secrets (`Backend/.env`), le certificat https de développement.
- **`Backend/tsconfig.json`** : `strict`, `noEmit` (TypeScript vérifie, `tsx` exécute), inclut `src`, `scripts`, `tests`.
- **`tsconfig.json` des sites** : `jsx: preserve`, `moduleResolution: bundler`, alias `@/`.
- **`next.config.ts` des sites** : relais `/api/*` → Backend.
- **`postcss.config.mjs`** : branche Tailwind CSS.
- **`deploy/`** : configuration du serveur de production (voir `deploy/DEPLOIEMENT.md`).
