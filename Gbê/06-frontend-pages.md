# 6. Le Frontend : Next.js et les pages

Dossier : `Frontend/src/app/`. Framework : Next.js 15 avec l'**App Router**.

## Les notions indispensables de Next.js

### 1. Un dossier = une adresse

```
src/app/page.tsx                    →  /
src/app/passager/page.tsx           →  /passager
src/app/passager/historique/page.tsx →  /passager/historique
src/app/(auth)/connexion/page.tsx   →  /connexion      (les parenthèses ne comptent pas)
```

Il n'y a aucun fichier de « configuration des routes » : créer un dossier avec un `page.tsx` suffit à créer une page.

### 2. Les `layout.tsx` s'emboîtent

Un `layout.tsx` entoure toutes les pages de son dossier et des sous-dossiers. Pour `/admin/courses`, Next.js assemble :

```
app/layout.tsx              (<html>, police, thème)
 └─ app/admin/layout.tsx    (vérifie que c'est un admin + menu latéral)
     └─ app/admin/courses/page.tsx   (le contenu)
```

Quand on navigue entre deux pages `/admin/...`, le layout admin **reste en place** : seul le contenu change (le menu ne clignote pas).

### 3. Composants serveur et composants client

C'est **la** notion la plus importante pour comprendre le Frontend.

| | Composant **serveur** (par défaut) | Composant **client** (`"use client"` en 1re ligne) |
|---|---|---|
| Où s'exécute-t-il ? | Sur le serveur Next.js, avant l'envoi de la page | Dans le navigateur (après un premier rendu serveur) |
| Peut-il être `async` et faire `await` ? | Oui | Non |
| Peut-il lire les cookies, appeler le Backend directement ? | Oui (`lib/server.ts`) | Non, il passe par `/api` (`lib/api.ts`) |
| Peut-il utiliser `useState`, `useEffect`, `onClick` ? | Non | Oui |
| Son code est-il envoyé au navigateur ? | Non | Oui |

**Dans ce projet** :
- Tous les fichiers `page.tsx` et `layout.tsx` sont des **composants serveur**. Ils vérifient la session et chargent les données initiales.
- Les écrans interactifs (`PassengerApp`, `DriverApp`, formulaires, écrans admin…) sont des **composants client**.
- Un composant serveur peut afficher un composant client et lui passer des données (`<PassengerApp user={user} />`). L'inverse n'est pas possible.

### 4. Les exports spéciaux d'une page

| Export | Effet | Exemple |
|---|---|---|
| `export default function ...` | Le composant de la page | Obligatoire |
| `export const metadata = { title }` | Le titre de l'onglet du navigateur | `"Commander — SURPLACE"` |
| `export const dynamic = "force-dynamic"` | La page est recalculée **à chaque visite** (jamais mise en cache). Indispensable ici car le contenu dépend de l'utilisateur connecté. | Presque toutes les pages |
| `searchParams` (paramètre) | Lit `?role=driver` ou `?statut=active` dans l'adresse | `inscription/page.tsx`, `admin/courses/page.tsx` |

## La protection des pages

Le schéma est le même pour chaque page privée :

```tsx
export default async function PassengerPage() {
  const { user } = await requirePageUser("passenger");   // lib/server.ts
  return <PassengerApp user={user} />;
}
```

`requirePageUser(role)` (dans `lib/server.ts`) :
1. appelle `GET /api/me` **directement sur le Backend** (pas via le proxy) en **recopiant le cookie** du visiteur ;
2. pas de session → redirection vers `/connexion` ;
3. mauvais rôle (ex. un chauffeur qui ouvre `/passager`) → redirection vers **son** espace ;
4. sinon renvoie `{ user, driver }`.

Cette vérification se fait **sur le serveur, avant l'envoi de la page** : un visiteur non autorisé ne voit jamais l'écran, même une fraction de seconde.

> Ce n'est pas la seule protection : chaque route API revérifie le rôle (`requireUser` côté Backend). Même si quelqu'un contournait la page, il ne pourrait rien lire ni modifier.

## Les pages une par une

### Racine

#### `app/layout.tsx` — le squelette de tout le site

- Charge la police **Plus Jakarta Sans** via `next/font/google` et l'expose en variable CSS `--font-jakarta` (utilisée par `globals.css`).
- `metadata` : titre et description par défaut (référencement Google, partage de lien).
- `viewport` : adaptation mobile, `maximumScale: 1` (empêche le zoom involontaire en touchant la carte), `themeColor` orange (couleur de la barre du navigateur mobile).
- Injecte `THEME_INIT_SCRIPT` dans `<head>` : un petit script qui applique le thème sombre **avant** l'affichage, pour éviter un « flash » blanc (voir `lib/theme.ts`).
- `suppressHydrationWarning` sur `<html>` : ce script modifie la classe de `<html>` avant que React prenne la main ; sans cet attribut, React afficherait un avertissement de différence.
- Importe `globals.css`.

#### `app/globals.css` — les styles globaux

1. `@import "tailwindcss"` : active Tailwind.
2. `@custom-variant dark (...)` : le mode sombre est déclenché par la **classe `.dark`** sur `<html>` (et non par le réglage de l'appareil directement), pour permettre le choix manuel clair/sombre/auto.
3. `@theme` : couleurs fixes de la marque (`brand` = orange `#ff6b00`, `night`) et la police.
4. `@theme inline` + `:root` + `.dark` : les **couleurs sémantiques** qui changent selon le thème : `canvas` (fond de page), `surface` (cartes), `subtle`, `line` (bordures), `muted` (texte secondaire), `ink` (texte), `contrast`… Ainsi `bg-surface` est blanc en clair et brun-noir en sombre, sans écrire `dark:` partout.
5. En `.dark`, quelques couleurs Tailwind (`amber`, `red`, `sky`, `emerald`, `violet`) sont redéfinies pour rester lisibles sur fond sombre.
6. Les styles des **marqueurs de carte** (`.pin-marker` en forme de goutte, `.driver-marker` rond avec 🏍️).
7. Carte en mode sombre : les tuiles OpenStreetMap sont **inversées** par un filtre CSS (`invert + hue-rotate`), astuce qui évite de payer un fond de carte sombre.

#### `app/page.tsx` — `/` la page d'accueil

Composant serveur. Charge en parallèle la session (pour afficher « Ouvrir l'application » au lieu de « S'inscrire ») et les avis publics.
Sections : bandeau (avec un **exemple de prix réel** calculé par `estimateTrip` entre la Gare routière et l'Université), « Comment ça marche » (`STEPS`), offres passager/chauffeur (tarifs lus dans `pricing.ts`), **avis** (`#avis`), **contact** (`#contact`, coordonnées de `lib/site.ts` + `ContactForm`).
Si le Backend est éteint, `loadReviews` renvoie `null` et la page s'affiche quand même, sans avis.

### Connexion / inscription — `app/(auth)/`

| Fichier | Rôle |
|---|---|
| `(auth)/layout.tsx` | Si l'utilisateur est **déjà connecté**, le redirige vers son espace. Sinon affiche le logo, le bouton de thème et la page. |
| `connexion/page.tsx` | `/connexion` : `LoginForm`. En développement uniquement (`NODE_ENV !== "production"`), affiche les comptes de démonstration. |
| `inscription/page.tsx` | `/inscription` : `RegisterForm`. `/inscription?role=driver` présélectionne « Chauffeur » (utilisé par le bouton « Devenir chauffeur » de l'accueil). |

Le groupe `(auth)` existe uniquement pour que ces deux pages partagent leur layout sans ajouter `/auth` à l'adresse.

### Espace passager — `app/passager/`

| Fichier | Adresse | Contenu |
|---|---|---|
| `page.tsx` | `/passager` | Vérifie le rôle, affiche `PassengerApp` (toute la logique est dans le composant) |
| `historique/page.tsx` | `/passager/historique` | Charge `/rides` **côté serveur** avec `backendGet`, affiche `HistoryPage` avec le nom du chauffeur |
| `profil/page.tsx` | `/passager/profil` | `ProfilePage` (formulaires infos + PIN) |

### Espace chauffeur — `app/chauffeur/`

| Fichier | Adresse | Contenu |
|---|---|---|
| `page.tsx` | `/chauffeur` | Vérifie le rôle, passe le profil chauffeur initial à `DriverApp`. `notFound()` si le compte n'a pas de ligne `drivers` (cas anormal). |
| `historique/page.tsx` | `/chauffeur/historique` | « Mes gains » : charge courses + abonnement en parallèle (`Promise.all`), **calcule sur le serveur** les totaux du jour, de 7 jours, global, et les jours d'abonnement restants, puis les affiche en tuiles au-dessus de l'historique |
| `profil/page.tsx` | `/chauffeur/profil` | `ProfilePage` avec les champs moto |

### Espace admin — `app/admin/`

| Fichier | Adresse | Contenu |
|---|---|---|
| `layout.tsx` | toutes les `/admin/...` | Vérifie le rôle **admin** une fois pour toutes, entoure de `AdminShell` (menu) |
| `page.tsx` | `/admin` | `OverviewPage` |
| `courses/page.tsx` | `/admin/courses` | `RidesPage` ; `?statut=active` / `completed` / `cancelled` présélectionne un filtre (utilisé par les liens de la vue d'ensemble) |
| `chauffeurs/page.tsx` | `/admin/chauffeurs` | `DriversPage` ; `?statut=pending` etc. |
| `passagers/page.tsx` | `/admin/passagers` | `PassengersPage` |
| `abonnements/page.tsx` | `/admin/abonnements` | `SubscriptionsPage` |
| `avis/page.tsx` | `/admin/avis` | `ReviewsPage` |
| `messages/page.tsx` | `/admin/messages` | `MessagesPage` |
| `administrateurs/page.tsx` | `/admin/administrateurs` | `AdminsPage` (reçoit `user` pour savoir s'il est principal) |
| `compte/page.tsx` | `/admin/compte` | `AccountPage` |

Les pages admin sont minuscules : les données sont chargées **dans le navigateur** par les composants (via `useAdminData`), car elles doivent se rafraîchir toutes les 10–30 secondes.

## Deux façons de charger des données

| | Côté serveur (`lib/server.ts › backendGet`) | Côté navigateur (`lib/api.ts › api`) |
|---|---|---|
| Où | Dans les `page.tsx` / `layout.tsx` | Dans les composants `"use client"` |
| Adresse appelée | `http://localhost:4000/api/...` directement | `/api/...` (relayé par Next.js) |
| Cookie | Recopié à la main depuis la requête du visiteur | Envoyé automatiquement par le navigateur |
| Quand | Une fois, à l'ouverture de la page | À la demande, en boucle, après un événement temps réel |
| Exemples | Session, historique, gains, avis de l'accueil | Course en cours, demandes disponibles, actions, admin |

Après une action qui modifie des données affichées par un composant serveur (connexion, profil), le code appelle `router.refresh()` : Next.js recalcule les composants serveur de la page sans recharger tout le navigateur.
