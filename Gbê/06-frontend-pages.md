# 6. Les sites Next.js : Application et Administration

Deux sites construits de la même façon :
- **`Application/`** (port 3000) : accueil public, passagers, chauffeurs ;
- **`Administration/`** (port 3001) : tableau de bord de l'équipe.

Framework : Next.js 15 avec l'**App Router**.

## Les notions indispensables de Next.js

### 1. Un dossier = une adresse

```
Application/src/app/page.tsx                     →  /                (Application)
Application/src/app/passager/historique/page.tsx →  /passager/historique
Application/src/app/(auth)/connexion/page.tsx    →  /connexion       (les parenthèses ne comptent pas)
Administration/src/app/(espace)/courses/page.tsx →  /courses         (Administration)
```

Créer un dossier avec un `page.tsx` suffit à créer une page.

### 2. Les `layout.tsx` s'emboîtent

Pour `/courses` dans l'Administration, Next.js assemble :

```
app/layout.tsx                 (<html>, police, thème)
 └─ app/(espace)/layout.tsx    (vérifie que c'est un admin + menu latéral)
     └─ app/(espace)/courses/page.tsx   (le contenu)
```

Quand on navigue entre deux écrans admin, le layout **reste en place** : seul le contenu change.

### 3. Composants serveur et composants client

| | Composant **serveur** (par défaut) | Composant **client** (`"use client"` en 1re ligne) |
|---|---|---|
| Où s'exécute-t-il ? | Sur le serveur Next.js, avant l'envoi de la page | Dans le navigateur (après un premier rendu serveur) |
| Peut-il être `async` et faire `await` ? | Oui | Non |
| Peut-il lire les cookies, appeler le Backend directement ? | Oui (`lib/server.ts`) | Non, il passe par `/api` (`lib/api.ts`) |
| Peut-il utiliser `useState`, `useEffect`, `onClick` ? | Non | Oui |
| Son code est-il envoyé au navigateur ? | Non | Oui |

Tous les `page.tsx` et `layout.tsx` sont des **composants serveur** (vérification de session, données initiales). Les écrans interactifs sont des **composants client**.

### 4. Les exports spéciaux d'une page

| Export | Effet |
|---|---|
| `export default function ...` | Le composant de la page (obligatoire) |
| `export const metadata = { title }` | Le titre de l'onglet |
| `export const dynamic = "force-dynamic"` | Page recalculée **à chaque visite** (contenu propre à l'utilisateur connecté) |
| `searchParams` (paramètre) | Lit `?role=driver` ou `?statut=active` dans l'adresse |

---

## L'Application (`Application/src/app/`)

### Protection des pages

```tsx
export default async function DriverPage() {
  const { user, driver } = await requirePageUser("driver");   // lib/server.ts
  ...
}
```

`requirePageUser(role)` appelle `GET /api/me` directement sur le Backend en **recopiant le cookie** du visiteur. Pas de session → `/connexion`. Mauvais rôle → vers **son** espace (`homeFor` ; un administrateur est renvoyé vers le site d'Administration, adresse `ADMIN_URL`).

**Exception** : `/passager` est **ouverte à tous** (commande sans compte). Elle utilise `getSession()` : visiteur → `PassengerApp` avec `user = null` ; chauffeur ou admin → redirigé vers son espace.

> Chaque route API revérifie aussi le rôle côté Backend : contourner une page ne permet rien.

### Racine

#### `app/layout.tsx`

Police **Plus Jakarta Sans** (`next/font/google`), `metadata` (titre et description pour Google), `viewport` (mobile, `themeColor` orange), script `THEME_INIT_SCRIPT` dans `<head>` (thème sombre appliqué **avant** l'affichage, sans « flash » blanc), `suppressHydrationWarning` sur `<html>`.

#### `app/globals.css`

1. `@import "tailwindcss"`.
2. `@custom-variant dark` : mode sombre déclenché par la classe `.dark` sur `<html>`.
3. `@theme` : couleurs de la marque (`brand` orange `#ff6b00`, `night`) et police.
4. Couleurs **sémantiques** qui changent selon le thème (`canvas`, `surface`, `line`, `muted`, `ink`…) : `bg-surface` est blanc en clair et brun-noir en sombre.
5. **Défilement « Comment ça marche »** (`.marquee`, `.marquee-track`) : les étapes sont répétées 3 fois et la bande glisse d'un tiers en 30 s, en boucle ; pause au survol ; immobile si l'appareil demande moins d'animations (`prefers-reduced-motion`). Un masque dégradé estompe les bords.
6. Marqueurs de carte et carte inversée en mode sombre.

#### `app/page.tsx` — `/` la page d'accueil

Composant serveur. Charge la session et les avis publics.
Sections : bandeau (« **Commander une moto** » mène à `/passager`, **sans inscription**), « Comment ça marche » (tableau `STEPS`, sans icônes, en défilement continu), offres passager/chauffeur, avis (`#avis`), contact (`#contact`).
Si le Backend est éteint, la page s'affiche quand même, sans avis.

### Connexion / inscription — `app/(auth)/`

| Fichier | Rôle |
|---|---|
| `(auth)/layout.tsx` | Utilisateur **déjà connecté** → son espace. **Sauf un invité** : il doit pouvoir se connecter à un compte existant ou créer le sien. |
| `connexion/page.tsx` | `/connexion` : `LoginForm` (passagers, chauffeurs). Comptes de démo affichés en développement. |
| `inscription/page.tsx` | `/inscription` : `RegisterForm`. `?role=driver` présélectionne « Chauffeur ». **Invité** : nom et numéro pré-remplis, message « vous retrouverez vos courses sur tous vos appareils ». |

### Espace passager — `app/passager/`

| Fichier | Adresse | Contenu |
|---|---|---|
| `page.tsx` | `/passager` | **Ouvert à tous** : `PassengerApp` avec l'utilisateur ou `null` |
| `historique/page.tsx` | `/passager/historique` | Charge `/rides` côté serveur, affiche `HistoryPage` (fonctionne aussi pour un invité) |
| `profil/page.tsx` | `/passager/profil` | `ProfilePage`. Un invité est redirigé vers `/inscription` (il n'a pas de PIN à modifier) |

### Espace chauffeur — `app/chauffeur/`

| Fichier | Adresse | Contenu |
|---|---|---|
| `page.tsx` | `/chauffeur` | `DriverApp` avec le profil initial |
| `historique/page.tsx` | `/chauffeur/historique` | « Mes gains » : totaux calculés sur le serveur + historique |
| `profil/page.tsx` | `/chauffeur/profil` | `ProfilePage` avec moto **et permis** |

---

## L'Administration (`Administration/src/app/`)

| Fichier | Adresse | Contenu |
|---|---|---|
| `layout.tsx` | toutes | `<html>`, police, thème. `robots: noindex` : le site n'apparaît pas dans Google |
| `connexion/page.tsx` | `/connexion` | Formulaire `LoginForm` (envoie `space: "admin"`). Admin déjà connecté → `/` |
| `(espace)/layout.tsx` | toutes les autres | `requireAdmin()` (sinon → `/connexion`) + `AdminShell` (menu latéral) |
| `(espace)/page.tsx` | `/` | `OverviewPage` (vue d'ensemble) |
| `(espace)/courses/page.tsx` | `/courses` | `RidesPage` ; `?statut=active` / `completed` / `cancelled` |
| `(espace)/chauffeurs/page.tsx` | `/chauffeurs` | `DriversPage` ; `?statut=pending` etc. |
| `(espace)/passagers/page.tsx` | `/passagers` | `PassengersPage` |
| `(espace)/abonnements/page.tsx` | `/abonnements` | `SubscriptionsPage` |
| `(espace)/avis/page.tsx` | `/avis` | `ReviewsPage` |
| `(espace)/messages/page.tsx` | `/messages` | `MessagesPage` |
| `(espace)/administrateurs/page.tsx` | `/administrateurs` | `AdminsPage` |
| `(espace)/compte/page.tsx` | `/compte` | `AccountPage` |

`lib/server.ts` de l'Administration est plus simple que celui de l'Application : `getAdmin()` renvoie l'admin connecté ou `null` (aussi si le cookie appartient à un passager ou un chauffeur), `requireAdmin()` redirige vers `/connexion`.

Les écrans admin chargent leurs données **dans le navigateur** (via `useAdminData`), car ils se rafraîchissent toutes les 10 à 30 secondes.

---

## Deux façons de charger des données (dans les deux sites)

| | Côté serveur (`lib/server.ts › backendGet`) | Côté navigateur (`lib/api.ts › api`) |
|---|---|---|
| Où | Dans les `page.tsx` / `layout.tsx` | Dans les composants `"use client"` |
| Adresse appelée | `http://localhost:4000/api/...` directement | `/api/...` (relayé par Next.js) |
| Cookie | Recopié à la main depuis la requête du visiteur | Envoyé automatiquement par le navigateur |
| Quand | Une fois, à l'ouverture de la page | À la demande, en boucle, après un événement temps réel |

Après une action qui change ce qu'affichent les composants serveur (connexion, profil, commande d'un invité), le code appelle `router.refresh()` : Next.js recalcule la page sans tout recharger.

---

## Pages ajoutées avec les nouvelles fonctionnalités

### Application

| Fichier | Adresse | Contenu |
|---|---|---|
| `app/manifest.ts` | `/manifest.webmanifest` | Rend l'application **installable** : nom, icônes (`public/icon-*.png`), couleurs, raccourcis « Commander » et « Espace chauffeur » |
| `app/(auth)/pin-oublie/page.tsx` | `/pin-oublie` | « Code PIN oublié » : numéro → code SMS → nouveau PIN (`PinResetForm`) |
| `app/notifications/page.tsx` | `/notifications` | Notifications 🔔 (lues à l'ouverture) ; propose d'activer les notifications sur le téléphone |
| `app/suivi/[token]/page.tsx` | `/suivi/<jeton>` | Suivi en direct d'une course partagée, **sans compte**, actualisé toutes les 5 s (`TrackView`). Non indexé par Google |
| `app/chauffeur/historique/page.tsx` | `/chauffeur/historique` | « Mes gains » : tuiles (jour, semaine, temps en ligne, taux d'acceptation, note, abonnement), graphique des 7 jours, répartition des notes, parrainage |
| `app/chauffeur/profil/page.tsx` | `/chauffeur/profil` | « Profil et documents » : infos, **documents** (`#documents`), **code de parrainage**, PIN |
| `app/page.tsx` | `/` | Les prix affichés (au km, minimum, abonnements, « X mois offerts ») viennent maintenant des **réglages de l'administration** (`/public/config`) |

`app/layout.tsx` ajoute `<PwaSetup />` (service worker, invitation à installer) et les métadonnées pour l'iPhone. Le script de thème applique aussi le **mode simple** avant l'affichage.

### Administration

| Adresse | Écran | Droit |
|---|---|---|
| `/alertes` | Urgences 🆘 : alertes à traiter, position sur une carte, personnes à appeler | `alerts` |
| `/reclamations` | Réclamations : réponse envoyée en notification, suppression | `complaints` |
| `/rapports` | Rapport mensuel et **exports Excel** | `reports` / `exports` |
| `/diffusion` | Messages groupés (notification, push, SMS en option) | `broadcast` |
| `/reglages` | Tarifs, majorations nuit / pluie, abonnements, attribution, parrainage, documents obligatoires | `settings` |
| `/lieux` | Lieux fréquents : ajout en touchant la carte, modification, désactivation | `places` |
| `/journal` | Journal des actions des administrateurs | `audit` |
| `/systeme` | État du serveur, services configurés, sauvegardes (« Sauvegarder maintenant ») | `system` |
| `/pin-oublie` | PIN oublié par SMS (hors de l'espace connecté) | — |

Le menu n'affiche que les écrans permis par le **rôle** de l'administrateur ; le Backend refuse de toute façon les appels non autorisés (403).
