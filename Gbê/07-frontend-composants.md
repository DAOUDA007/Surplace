# 7. Composants, hooks et utilitaires du Frontend

## Petit rappel React

- Un **composant** est une fonction qui renvoie du JSX (du HTML dans du JavaScript) : `function Logo() { return <a>...</a> }`.
- Les **props** sont ses paramètres : `<Logo light />`.
- `useState` mémorise une valeur ; la changer **redessine** le composant.
- `useEffect` exécute du code après l'affichage (démarrer une minuterie, s'abonner à quelque chose) et peut renvoyer une fonction de **nettoyage** (arrêter la minuterie).
- `useRef` mémorise une valeur **sans** redessiner (utile pour « la valeur précédente »).
- `useCallback` / `useMemo` évitent de recréer une fonction / recalculer une valeur à chaque affichage.

---

## `components/` — écrans principaux

### `PassengerApp.tsx` — l'écran passager (≈ 480 lignes)

L'écran affiche toujours la carte en fond et un panneau (`Sheet`) qui change selon la situation :

```
pas encore chargé      → rectangle gris animé
course en cours        → <ActiveRide>   (recherche / chauffeur en route / arrivé / en course)
course à noter         → <RateRide>     (🎉 + étoiles + commentaire)
sinon                  → formulaire : départ, destination, prix estimé, bouton « Commander »
```

**États principaux** : `ride` (course en cours), `rideToRate`, `pickup` et `dropoff` (lieux choisis), `target` (quel champ reçoit le prochain clic sur la carte), `driverPos` (position de la moto), `accuracy` (cercle de précision GPS), `notice` / `error` (messages).

**Fonctionnement** :
1. **`refresh()`** interroge `/api/rides/current`. En comparant avec la course précédente (`previous` ref), elle déduit ce qui s'est passé et affiche un message : « Aucun chauffeur n'a accepté… » (timeout), « Le chauffeur a annulé, nous recherchons un autre chauffeur… », « Votre course a été annulée ». `selfCancelled` évite d'afficher ce message quand c'est le passager lui-même qui annule.
2. Appelée au chargement, **toutes les 15 s** (filet de sécurité) et à chaque événement temps réel `ride`.
3. L'événement `location` met à jour `driverPos` **sans** appel à l'API (la moto bouge en direct).
4. **`locate()`** : au chargement, place automatiquement le départ sur la position GPS (affinée progressivement). Si l'utilisateur choisit un départ à la main pendant ce temps (`manualPickup`), la localisation ne l'écrase pas. Avertit si la position est à plus de 50 km de Korhogo ou imprécise (> 150 m).
5. **Choisir un lieu** : par la recherche (`PlaceSearch`), en touchant la carte (`pickOnMap`), ou en faisant glisser un marqueur (`onDragEnd`). Le nom du point est obtenu par `reverseGeocode`.
6. **Estimation** : `estimateTrip(pickup, dropoff)` calculée dans le navigateur (`useMemo`) → affichage du prix.
7. **Commander** : `POST /api/rides`. **Annuler** : `POST /api/rides/:id/action { action: "cancel" }`.
8. **Recadrage de la carte** (`fitTo`) : avant la commande, sur départ + arrivée ; chauffeur en route, sur moto + départ ; en course, sur moto + arrivée.
9. **Temps d'arrivée** (`eta` dans `ActiveRide`) : distance moto → cible ×1,3 à 25 km/h.

Sous-composants dans le même fichier : `Searching` (animation + chronomètre via `useElapsed`), `ActiveRide` (infos chauffeur, bouton 📞 `tel:`, prix, annulation), `RateRide` (étoiles, commentaire, « Plus tard » / « Envoyer »).

### `DriverApp.tsx` — l'écran chauffeur (≈ 460 lignes)

Panneau selon la situation :

```
compte pas validé        → <AccountPending>  (en attente de validation / suspendu)
course juste terminée    → ✅ « Encaissez X FCFA »
panneau abonnement ouvert → <SubscriptionPanel>
course en cours          → <CurrentRide> (Je suis arrivé / Démarrer / Terminer / Annuler, itinéraire Google Maps)
sinon                    → gains du jour, bouton En ligne / Hors ligne, état d'abonnement,
                           case « mode démo », liste des demandes à proximité (bouton Accepter)
```

**Chargements** : `loadProfile` (`/api/me` + `/api/driver/subscription`), `loadAvailable` (`/api/driver/available`), `loadToday` (calcule les gains du jour à partir de `/api/rides`), `loadRide` (`/api/rides/current` ; si la course disparaît, vérifie si le passager l'a annulée). `refreshAll` lance les quatre en parallèle.

**Temps réel** : `available-rides` → recharge les demandes ; `ride` → recharge la course ; `profile` → recharge le profil (validation, suspension, abonnement confirmé par l'admin).

**Position du chauffeur** — trois mécanismes :
1. **GPS réel** (`watchPosition`) quand le chauffeur est en ligne et que le mode démo est désactivé. Si le GPS est indisponible ou que le site n'est pas en https, bascule automatiquement en mode démo avec un message.
2. **Mode démo** (activé par défaut en développement, car un ordinateur n'a pas de GPS) : toutes les 2 s, la moto avance de 90 m (`DEMO_STEP_M`, fonction `moveToward`) vers le point de départ puis vers la destination. On peut aussi **toucher la carte** pour placer la moto.
3. **Envoi au serveur** : chaque changement de `position` est envoyé à `/api/driver/location`, **au plus toutes les 1,5 s** (`lastSent`) pour ne pas surcharger le serveur.

**Actions** : `toggleOnline`, `accept(id)`, `step("arrive" | "start" | "complete" | "cancel")`. La fonction `run(key, fn)` gère le bouton en cours de chargement (`busy`) et les erreurs pour toutes.

### `AppShell.tsx` — la mise en page plein écran

Utilisé par `PassengerApp` et `DriverApp`.
- `AppShell` : la carte occupe tout l'écran (`absolute inset-0`), la barre du haut flotte au-dessus (logo, élément central facultatif, menu). `pointer-events-none` sur la barre et `pointer-events-auto` sur ses boutons : on peut toucher la carte entre les boutons.
- `Sheet` : le panneau. **Sur mobile** : collé en bas, coins arrondis, petite poignée grise, 72 % de la hauteur au maximum. **Sur ordinateur** (`md:`) : carte flottante à gauche de 400 px. `forwardRef` permet à `useSheetHeight` de mesurer sa hauteur.
- `z-[1000]` : Leaflet utilise des `z-index` jusqu'à ~800 ; il faut passer au-dessus.

### `AppMenu.tsx` — le menu ☰

Bouton avec l'initiale et le prénom ; au clic, liste : liens propres au rôle (passés en props), thème, « Se déconnecter » (`POST /api/auth/logout` puis retour à `/`).

### `MapView.tsx` et `LeafletMap.tsx` — la carte

**Pourquoi deux fichiers ?** Leaflet utilise `window` dès son chargement, qui n'existe pas sur le serveur. `MapView` charge `LeafletMap` avec `dynamic(..., { ssr: false })` : la carte n'est importée **que dans le navigateur**, et un rectangle gris animé s'affiche en attendant. Les autres fichiers importent toujours `MapView`.

`LeafletMap` reçoit :

| Prop | Rôle |
|---|---|
| `markers` | Liste de marqueurs : `pickup` (vert « D »), `dropoff` (rouge « A »), `request` (orange « ! », demande en attente), `driver` (🏍️). Chacun peut être cliquable, déplaçable (`onDragEnd`), avoir une info-bulle. |
| `route` | Ligne pointillée entre deux points (ligne droite, pas l'itinéraire routier réel) |
| `fitTo` | Points à garder visibles ; la carte se recadre quand cette liste change |
| `onMapClick` | Appelée avec les coordonnées du clic |
| `bottomPadding` | Hauteur cachée par le panneau du bas, pour recadrer au-dessus |
| `accuracy` | Cercle vert de précision GPS |

Composants internes : `ClickHandler` (écoute les clics), `FitBounds` (recadre ; la clé `key` construite à partir des coordonnées arrondies évite de recadrer à chaque petit mouvement). Les icônes sont des `divIcon` (du HTML stylé par `globals.css`) plutôt que des images.

### `PlaceSearch.tsx` — champ de lieu avec suggestions

- Suggestions **locales** immédiates : `searchPopularPlaces` (lieux fréquents de Korhogo, sans accent ni majuscule).
- Suggestions **Nominatim** : à partir de 3 caractères, après **500 ms sans frappe** (« debounce », pour ne pas interroger le service à chaque lettre). La requête précédente est annulée (`AbortController`) si l'utilisateur continue de taper.
- Les doublons entre les deux listes sont retirés.
- Si le lieu est choisi sur la carte, le texte du champ se met à jour (`useEffect` sur `value`).
- `active` / `onActivate` : le champ actif (bordure) est celui que le prochain clic sur la carte remplira.

### `AuthForms.tsx` — connexion et inscription

- `useSubmit()` : envoie le formulaire, puis `router.replace(redirect)` (la réponse du Backend dit où aller) et `router.refresh()`.
- `LoginForm` : téléphone + PIN.
- `RegisterForm` : sélecteur Passager / Chauffeur ; les champs **plaque** et **modèle de moto** n'apparaissent que pour un chauffeur ; e-mail facultatif.
- `PinInput` : champ numérique de 4 chiffres (`inputMode="numeric"` → clavier numérique sur mobile).
- `AuthShell` : titre + sous-titre + contenu, utilisé par les deux pages.

### `ProfilePage.tsx` et `ProfileForm.tsx` — « Mon profil »

- `ProfilePage` : mise en page (retour à la carte, thème, titre) commune passager / chauffeur.
- `ProfileInfoForm` : nom, téléphone, e-mail (+ plaque et moto si `driver` est fourni). Prévient qu'un changement de véhicule entraîne une revalidation. Envoie à `/api/me/profile` puis `router.refresh()`.
- `PinForm` : PIN actuel + nouveau + confirmation → `/api/me/pin`.
- Réutilisés aussi par l'admin dans `admin/AccountPage.tsx`.

### `RideHistory.tsx` — `HistoryPage`

Liste de courses (date, statut, trajet, prix, note, nom du chauffeur si `showDriver`). Le paramètre `summary` permet d'ajouter un bloc au-dessus (les tuiles de gains du chauffeur). C'est un composant **serveur** (pas de `"use client"`) : pur affichage.

### `SubscriptionPanel.tsx` — abonnement du chauffeur

État (actif jusqu'au …, jours restants, ou expiré), choix Mensuel / Annuel (avec l'économie annuelle calculée : `YEARLY_SAVING`), envoi de la demande, annulation d'une demande en attente, historique des paiements. Exporte aussi `formatDate`.

### `ContactForm.tsx` — formulaire de l'accueil

Nom, téléphone ou e-mail, sujet (liste `CONTACT_SUBJECTS` de `lib/site.ts`), message → `/api/public/contact`. Message de confirmation et remise à zéro après envoi.

### `ThemeToggle.tsx` — clair / sombre / auto

Cycle ☀️ Clair → 🌙 Sombre → 🖥️ Auto. Enregistre le choix dans `localStorage` (clé `surplace-theme`) et ajoute/retire la classe `dark` sur `<html>`. En mode Auto, suit en direct le réglage de l'appareil. Tant que le composant n'a pas lu le stockage, il affiche 🌓 (évite une différence entre le rendu serveur et le navigateur).

### `Logo.tsx` et `ui.tsx` — petits éléments

- `Logo` : 🏍️ + « SUR**PLACE** », lien vers l'accueil (ou `href` donné). `light` = texte blanc (bandeau sombre).
- `ui.tsx` :
  - `Button` : 4 variantes (`primary` orange, `dark`, `ghost`, `danger`), état `loading` avec rond qui tourne.
  - `StatusBadge` : pastille colorée du statut d'une course (libellés et couleurs dans `lib/format.ts`).
  - `ErrorMessage` : encadré rouge (n'affiche rien si vide).
  - `Route` : départ (point vert) → arrivée (carré rouge).
  - `Stars` : ★ 4.7 ou « Nouveau ».

---

## `components/admin/` — l'espace administrateur

### `AdminShell.tsx`

- Menu latéral défini par le tableau **`NAV`** (sections Activité, Utilisateurs, Finances, Relation client, Paramètres). Pour ajouter un écran admin, on ajoute une ligne ici + un dossier dans `app/admin/`.
- **Pastilles** : `badge` indique quel compteur de `/api/admin/counts` afficher. Rouge = action requise ; `info: true` = neutre (courses actives).
- Sur mobile, le menu devient un **tiroir** qui se ferme à chaque changement de page.
- Compteurs rafraîchis toutes les 15 s et après chaque action (événement `admin:changed`).

### `ui.tsx` (admin)

`PageHeader`, `Card`, `StatTile` (tuile chiffre clé), `FilterTabs` (onglets de filtre), `SearchInput`, `EmptyState`, `LoadingRows`, `PageError`, `TableWrap` (tableau qui défile horizontalement sur mobile), classes `th`/`td`, et surtout :

**`ActionButton`** avec `confirm` : le **premier clic** transforme le bouton en pastille rouge affichant le texte de confirmation (« Confirmer ? ») ; un **second clic dans les 4 secondes** exécute l'action. Sinon il revient à son état normal. C'est la « double confirmation » des actions sensibles, sans fenêtre `confirm()` du navigateur.

### Les écrans

| Fichier | Données (`useAdminData`) | Actions principales |
|---|---|---|
| `OverviewPage.tsx` | `/api/admin/overview` (toutes les 10 s) | — (liens vers les autres écrans). Tuiles, carte des chauffeurs en ligne (`MapView`), éléments à traiter, graphique 7 jours (`WeekChart`, barres en CSS), courses actives |
| `RidesPage.tsx` | `/api/admin/rides?status=&q=` (10 s) | Annuler une course active, supprimer. Détail avec `Timeline` (heure de chaque étape) |
| `DriversPage.tsx` | `/api/admin/drivers?status=&q=` | Valider, refuser/suspendre, réactiver, encaisser un abonnement, supprimer ; historique du chauffeur (`DriverRides`). « Refuser » un nouveau chauffeur le passe en réalité au statut `suspended` (il n'existe pas de statut « refusé ») |
| `PassengersPage.tsx` | `/api/admin/passengers?status=&q=` | Bloquer, débloquer, supprimer ; historique (`PassengerRides`) |
| `SubscriptionsPage.tsx` | `/api/admin/subscriptions` | Paiement reçu, refuser, supprimer |
| `ReviewsPage.tsx` | `/api/admin/reviews` | Masquer/afficher, supprimer |
| `MessagesPage.tsx` | `/api/admin/messages` | Marquer traité, supprimer ; lien « Répondre » (`replyLink` : `mailto:` si le contact contient un @, sinon `tel:` s'il y a au moins 8 chiffres) |
| `AdminsPage.tsx` | `/api/admin/admins` (30 s) | (principal uniquement) ajouter (`AddAdminForm`), suspendre, réactiver, supprimer, céder le rôle principal |
| `AccountPage.tsx` | — | Formulaires profil + PIN. Avertissement si le compte de démo `07 00 00 00 00` est encore utilisé |

---

## `hooks/` — logique réutilisable

### `useServerEvents(onEvent, onReconnect?)`

Ouvre `new EventSource("/api/events")` une seule fois, transmet chaque événement (sauf les `ping`) à `onEvent`. Le navigateur **se reconnecte automatiquement** après une coupure ; à la reconnexion, `onReconnect` est appelé pour **resynchroniser** (des événements ont pu être manqués pendant la coupure).

Astuce : les fonctions reçues sont rangées dans des `useRef`. Ainsi la connexion n'est **pas** rouverte à chaque nouvel affichage du composant, tout en appelant toujours la version la plus récente de `onEvent`.

### `useAdminData<T>(path, intervalMs = 15000)`

Charge `path`, le recharge toutes les `intervalMs` et à chaque événement `admin:changed`. Renvoie `{ data, error, loading, refresh }`. Quand `path` change (filtre, recherche), recharge ; une réponse arrivée **après** un changement de filtre est ignorée (`current` ref), pour ne pas afficher de vieux résultats.

### `useAdminAction()`

`run(key, path, body)` : envoie le `POST`, puis appelle `notifyAdminChange()`, qui déclenche l'événement navigateur `admin:changed` : **tous** les `useAdminData` de la page (liste, compteurs du menu) se rafraîchissent. `busy` contient la clé de l'action en cours (pour afficher le chargement sur le bon bouton).

### `useSheetHeight()`

Mesure en continu (`ResizeObserver`) la hauteur du panneau du bas **sur mobile** (< 768 px ; 0 sur ordinateur). Transmise à la carte (`bottomPadding`) pour que les points ne soient pas cachés derrière le panneau.

---

## `lib/` — outils sans interface

| Fichier | Contenu |
|---|---|
| `api.ts` | `api<T>(path, body?)` : sans `body` → `GET`, avec `body` → `POST` JSON. `cache: "no-store"`. Si la réponse est une erreur, lève une `Error` avec le message français du Backend, prête à être affichée. |
| `server.ts` | **Uniquement côté serveur** (`import "server-only"`). `backendGet` (appel direct au Backend avec le cookie du visiteur ; `401`/`403` → `null`), `getSession` (renvoie `null` si le Backend est injoignable, au lieu de planter la page), `homeFor`, `requirePageUser`. |
| `types.ts` | Types partagés avec le Backend + types de l'admin (`AdminDriver`, `AdminPassenger`, `AdminCounts`, `AdminOverview`, `DriverSubscription`, `PublicReviews`…). |
| `pricing.ts` | Copie exacte de `Backend/src/pricing.ts`. |
| `site.ts` | `CONTACT` (téléphone, WhatsApp, e-mail, adresse, horaires affichés sur l'accueil) et `CONTACT_SUBJECTS`. |
| `places.ts` | `CITY_NAME`, `CITY_CENTER` (centre de Korhogo), `POPULAR_PLACES` (16 lieux, coordonnées approximatives), `searchPopularPlaces` (recherche sans accents), `searchAddress` (Nominatim limité à un rectangle autour de Korhogo : `viewbox` + `bounded`), `reverseGeocode` (nom d'un point ; en cas d'échec, « Point sur la carte (lat, lng) »). `shortLabel` garde les 3 premières parties de l'adresse. |
| `geolocation.ts` | `locateUser(onUpdate)` : utilise `watchPosition` pour **affiner** la position (la première lecture vient souvent du réseau, imprécise ; le GPS arrive ensuite). S'arrête dès que la précision atteint 30 m ou après 15 s, et renvoie la meilleure lecture. Si le GPS ne répond pas, tente une position approximative. `geolocationErrorMessage` traduit chaque échec (pas https, refusé, introuvable, trop long) en conseil compréhensible. |
| `format.ts` | `STATUS_LABELS` (« Chauffeur en route »…), `STATUS_STYLES` (couleurs des pastilles), `formatDateTime` (« 5 oct., 14:32 »), `formatPhone` (« 07 00 00 00 01 »), `minutesFromKm`. |
| `theme.ts` | `THEME_STORAGE_KEY` et `THEME_INIT_SCRIPT` (script minifié exécuté dans `<head>` avant l'affichage). |
