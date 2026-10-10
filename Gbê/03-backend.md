# 3. Le Backend, fichier par fichier

Dossier : `Backend/src/`. Langage : TypeScript exécuté par `tsx`. Serveur : Express. Base : SQLite via `better-sqlite3`.

## Comment une requête traverse le Backend

```
Requête HTTP  (ex. POST /api/rides  avec un cookie surplace_session)
   │
   ▼
server.ts
   ├─ express.json()     → transforme le corps JSON en objet req.body (100 ko max)
   ├─ cookieParser()     → transforme les cookies en objet req.cookies
   ├─ route "/rides"     → enveloppée par route() (http.ts)
   │     ├─ requireUser(req, "passenger")   (auth.ts)   → qui est-ce ? a-t-il le bon rôle ?
   │     └─ createRide(user, pickup, dropoff) (rides.ts)  → règles + SQL (db.ts) + événements (events.ts)
   │
   ├─ si tout va bien : route() renvoie le résultat en JSON (code 200)
   └─ si une HttpError est levée : errorHandler() renvoie { error: "message" } avec le bon code
```

---

## `server.ts` — le point d'entrée

**Rôle** : créer l'application Express, déclarer toutes les routes et démarrer l'écoute sur le port 4000.

Points clés, dans l'ordre du fichier :

1. **`import "./env"` en premier** : les autres modules lisent `process.env` dès leur chargement (par ex. `mailer.ts` crée le transporteur Gmail à l'import). Il faut donc que `.env` soit chargé avant.
2. **`app.disable("x-powered-by")`** : n'annonce pas « Express » dans les en-têtes (petite mesure de discrétion).
3. **`app.set("trust proxy", "loopback")`** : les requêtes arrivent du proxy Next.js (même machine). Ce réglage fait confiance à l'en-tête `X-Forwarded-For` pour connaître la **vraie IP** du visiteur. Utilisé par la limite anti-spam du formulaire de contact.
4. **`const api = express.Router()`** : toutes les routes sont attachées à ce routeur, lui-même monté sur `/api` à la fin (`app.use("/api", api)`).
5. Les routes, groupées par thème avec des commentaires `// --- Authentification ---`, `// --- Courses ---`, etc. La liste complète est dans [05-routes-api.md](05-routes-api.md).
6. **Les routes d'inscription et de connexion** sont écrites directement dans `server.ts` (pas dans un fichier métier) car elles sont courtes.
7. **`adminDelete(path, fn)`** : petite fonction qui fabrique les 6 routes de suppression admin d'un coup, pour éviter de répéter 6 fois le même code.
8. **`/events`** : la route du temps réel (Server-Sent Events), expliquée plus bas.
9. **`/health`** : renvoie `{ ok: true }`. Sert à vérifier que l'API répond (surveillance, hébergeur).
10. Une route « attrape-tout » renvoie `404 Route introuvable.` pour les adresses `/api/...` inconnues, puis `errorHandler` traite les erreurs.

### L'inscription (`POST /auth/register`) en détail

```ts
const role = body.role === "driver" ? "driver" : "passenger";
```
Toute valeur autre que `"driver"` devient `"passenger"`. On ne peut **pas** s'inscrire comme `admin` : sécurité par construction.

Puis : validation de chaque champ → **cas de l'invité** : si la personne est déjà connectée en passager invité et s'inscrit comme passager, son compte invité est **transformé** en vrai compte (`convertGuest`) et ses courses sont conservées → sinon refus si le numéro existe (`409`) → dans une **transaction**, insertion dans `users` et, pour un chauffeur, dans `drivers` avec plaque, modèle et **numéro de permis** (`validateLicense`), statut `pending` par défaut → création de la session → e-mail de bienvenue en arrière-plan → renvoi de `{ redirect: "/passager" }` ou `"/chauffeur"`.

La **transaction** (`db.transaction(() => {...})()`) garantit que si l'insertion dans `drivers` échoue (permis manquant), l'utilisateur n'est pas créé à moitié.

### La connexion (`POST /auth/login`)

Le même message `"Numéro ou code PIN incorrect."` est renvoyé que le numéro existe ou non : on ne révèle pas quels numéros sont inscrits. Un compte bloqué reçoit `403`.

**Cloisonnement des deux sites** : le formulaire de l'Administration envoie `space: "admin"`.
- `space: "admin"` + compte non admin → `403 Accès réservé aux administrateurs SURPLACE.`
- sans `space` (Application) + compte admin → `403 Les administrateurs se connectent sur l'espace d'administration.`

La vérification se fait **avant** la création de la session : aucun cookie n'est posé en cas de refus.

### La commande sans compte (`POST /rides/guest`)

Reçoit `name`, `phone`, `pickup`, `dropoff`.
1. Refuse si la personne est déjà connectée (`409`) : elle doit utiliser `POST /rides`.
2. **Limite anti-abus** : 5 commandes sans compte par adresse IP et par heure (`guestOrdersByIp`, en mémoire) → `429` au-delà.
3. Dans **une transaction** : `createGuestPassenger` (crée le passager invité) puis `createRide`. Si la course est invalide (trajet trop court, trop long…), l'erreur annule aussi la création du compte : pas de compte « fantôme ».
4. Crée la session (cookie) : l'invité est désormais reconnu sur ce téléphone.

Un invité ne peut pas modifier son profil ni son PIN (`/me/profile`, `/me/pin` → `403`, constante `GUEST_PROFILE_ERROR`) : il crée d'abord son compte via l'inscription.

### Le temps réel (`GET /events`)

Technique : **Server-Sent Events (SSE)**. Le navigateur ouvre une connexion qui **reste ouverte** ; le serveur y écrit une ligne `data: {...}` chaque fois qu'il a quelque chose à signaler.

```
res.writeHead(200, { "Content-Type": "text/event-stream", ... })
abonnement au canal  user:<id>         (tout utilisateur)
abonnement au canal  drivers           (chauffeurs seulement)
ping toutes les 25 s                   (empêche les proxys de couper la connexion inactive)
à la fermeture : on se désabonne       (sinon fuite de mémoire)
```

`X-Accel-Buffering: no` désactive la mise en mémoire tampon de certains serveurs (nginx) qui retarderaient les messages.

**Pourquoi SSE et pas WebSocket ?** Les messages vont seulement du serveur vers le navigateur (le navigateur, lui, utilise des requêtes `POST` classiques). SSE suffit, fonctionne en HTTP normal, passe par le proxy Next.js et se **reconnecte tout seul**.

---

## `env.ts` — chargement des secrets

```ts
process.loadEnvFile(path.join(process.cwd(), ".env"));
```
Lit `Backend/.env` et remplit `process.env`. Si le fichier n'existe pas, l'erreur est ignorée et les valeurs par défaut s'appliquent. `process.cwd()` = le dossier depuis lequel on lance la commande, c'est-à-dire `Backend/` (les scripts npm s'exécutent dans le dossier du `package.json`).

---

## `http.ts` — erreurs et réponses

- **`class HttpError`** : une erreur qui porte un **code HTTP** et un message en français destiné à l'utilisateur. Partout dans le Backend, on écrit `throw new HttpError(409, "Ce numéro est déjà utilisé.")`.
- **`route(fn)`** : enveloppe chaque gestionnaire de route. Elle :
  - exécute `fn` (synchrone ou `async`) ;
  - renvoie son résultat en JSON, ou `{ ok: true }` si `fn` ne renvoie rien ;
  - transmet toute erreur à `errorHandler`.
  Sans elle, chaque route devrait contenir son propre `try/catch` et son `res.json(...)`.
- **`errorHandler`** :
  - `HttpError` → son code et `{ error: message }` ;
  - `SyntaxError` (JSON mal formé envoyé par le client) → `400 Requête invalide.` ;
  - toute autre erreur → affichée dans la console et `500 Erreur interne du serveur.` (on ne montre jamais les détails techniques à l'utilisateur).

**Codes HTTP utilisés dans le projet :**

| Code | Signification | Exemple |
|---|---|---|
| 400 | Saisie invalide | PIN de 3 chiffres, destination trop proche |
| 401 | Pas connecté | Session absente ou expirée |
| 402 | Paiement requis | Chauffeur sans abonnement actif qui veut passer en ligne |
| 403 | Interdit | Un passager qui appelle une route admin, compte bloqué |
| 404 | Introuvable | Course inexistante |
| 409 | Conflit avec l'état actuel | Course déjà prise par un autre chauffeur, numéro déjà utilisé |
| 429 | Trop de requêtes | Plus de 3 messages de contact en 10 minutes |
| 500 | Bug côté serveur | Erreur inattendue |

---

## `validation.ts` — vérifier les saisies

Chaque fonction **renvoie la valeur nettoyée** ou **lève une `HttpError(400)`** :

| Fonction | Ce qu'elle fait |
|---|---|
| `normalizePhone` | Retire espaces, points, tirets, parenthèses et le préfixe `+225`/`00225` ; exige 10 chiffres commençant par 0. `"+225 07 00 00 00 01"` → `"0700000001"`. Ainsi un même numéro est toujours stocké de la même façon. |
| `optionalEmail` | Vide → `null` ; sinon minuscules + format vérifié (120 caractères max). |
| `validatePin` | Exactement 4 chiffres. |
| `requiredText` | Texte non vide, coupé à une longueur maximale (80 par défaut). |
| `validateLicense` | Numéro de permis de conduire : obligatoire, 5 à 30 caractères, mis en majuscules. |
| `parseId` | Transforme `"12"` (paramètre d'URL) en nombre entier positif. |

Règle d'or : **ne jamais faire confiance aux données venant du navigateur**. Même si le formulaire de l'Application vérifie déjà, le Backend revérifie.

---

## `password.ts` — protéger les codes PIN

Les PIN ne sont **jamais stockés en clair**.

- `hashPin(pin)` : génère un **sel** aléatoire (16 octets), calcule `scrypt(pin, sel)` et stocke `"sel:empreinte"` dans `users.pin_hash`.
  - Le **sel** rend chaque empreinte unique : deux utilisateurs avec le PIN `1234` ont des empreintes différentes.
  - **scrypt** est volontairement lent et gourmand en mémoire, ce qui ralentit les tentatives de devinette.
- `verifyPin(pin, stored)` : recalcule avec le même sel et compare avec `timingSafeEqual`, une comparaison qui prend toujours le même temps (empêche de deviner l'empreinte en mesurant le temps de réponse).

---

## `auth.ts` — les sessions

**Principe** : à la connexion, le serveur crée un **jeton aléatoire** (64 caractères hexadécimaux), l'enregistre dans la table `sessions` avec une date d'expiration (30 jours) et l'envoie au navigateur dans un **cookie** `surplace_session`. À chaque requête, le navigateur renvoie ce cookie et le serveur retrouve l'utilisateur.

Options du cookie (dans `createSession`) :

| Option | Effet |
|---|---|
| `httpOnly: true` | Le JavaScript de la page ne peut pas lire le cookie (protège contre le vol par script malveillant) |
| `sameSite: "lax"` | Le cookie n'est pas envoyé par les formulaires d'autres sites (protège contre les attaques CSRF) |
| `secure` (en production) | Envoyé seulement en https |
| `expires` | 30 jours |

Fonctions :

| Fonction | Rôle |
|---|---|
| `createSession(res, userId)` | Crée le jeton, la ligne en base et le cookie |
| `destroySession(req, res)` | Supprime la ligne et efface le cookie (déconnexion) |
| `getCurrentUser(req)` | Lit le cookie et renvoie l'utilisateur **si** la session n'est pas expirée, le compte n'est pas bloqué ni supprimé. Sinon `null`. Ajoute `isPrincipal` pour un admin et `isGuest: true` pour un passager invité. Le téléphone renvoyé est `COALESCE(guest_phone, phone)` : le vrai numéro, invité ou non. |
| `requireUser(req, role?)` | Comme `getCurrentUser` mais lève `401` si personne n'est connecté et `403` si le rôle ne correspond pas. C'est **la** protection de chaque route. |
| `homeFor(role)` | Adresse d'accueil après connexion : `/passager`, `/chauffeur`, ou `/` pour un admin (la racine du site d'Administration). L'Application a sa propre version dans `lib/server.ts`, qui renvoie un admin vers `ADMIN_URL`. |

**Pourquoi des sessions en base plutôt qu'un JWT ?** Une session en base peut être **révoquée immédiatement** : bloquer un compte supprime ses lignes `sessions` et l'utilisateur est déconnecté à sa prochaine requête.

---

## `db.ts` — la base de données

Détaillé dans [04-base-de-donnees.md](04-base-de-donnees.md). Résumé :

- `open()` crée le dossier `data/`, ouvre le fichier, active le mode **WAL** et les **clés étrangères**, exécute le `SCHEMA` (tables), puis `migrate()` et `seed()`.
- **L'astuce `globalThis`** en bas du fichier : en développement, `tsx watch` peut recharger des modules. Stocker la connexion dans `globalThis.surplaceDb` garantit qu'**une seule** connexion existe par processus. La même astuce est utilisée dans `events.ts` pour le bus.

---

## `events.ts` — le bus temps réel

Un `EventEmitter` de Node.js (un « tableau d'affichage » en mémoire).

| Fonction | Rôle |
|---|---|
| `publish(canal, événement)` | Envoie un événement à tous les abonnés d'un canal |
| `publishToUser(userId, événement)` | Raccourci pour le canal `user:<id>` (ne fait rien si `userId` est vide) |
| `subscribe(canal, écouteur)` | S'abonne ; renvoie une fonction pour se désabonner |

**Canaux** : `user:12` (tout ce qui concerne l'utilisateur 12) et `drivers` (tous les chauffeurs connectés).

**Types d'événements** (définis dans `types.ts`, `ServerEvent`) :

| Événement | Envoyé quand | Effet côté écran |
|---|---|---|
| `{ type: "ride", rideId }` | Une course change d'état | Recharger la course en cours |
| `{ type: "available-rides" }` | La liste des demandes a changé | Les chauffeurs rechargent les demandes |
| `{ type: "location", rideId, lat, lng }` | Le chauffeur a bougé | Le passager déplace la moto sur la carte |
| `{ type: "profile" }` | Statut ou abonnement du chauffeur modifié | Le chauffeur recharge son profil |

Notez que les événements contiennent **très peu de données** : ils disent « quelque chose a changé », et l'écran redemande l'état complet via l'API. C'est plus simple et toujours juste, même si un événement est perdu.

`setMaxListeners(0)` supprime l'avertissement de Node quand beaucoup d'utilisateurs sont connectés.

> Limite : le bus est **en mémoire**. Il ne fonctionne que si un seul processus Backend tourne. Pour plusieurs serveurs, il faudrait un bus partagé (Redis), comme le note le README.

---

## `rides.ts` — le cœur : les courses

### Constantes

| Constante | Valeur | Rôle |
|---|---|---|
| `REQUEST_TIMEOUT_MIN` | 5 | Une demande sans chauffeur est annulée après 5 minutes |
| `DISPATCH_RADIUS_KM` | 10 | Un chauffeur voit les demandes dans un rayon de 10 km |
| `ACTIVE_STATUSES` | requested, accepted, arrived, in_progress | Les statuts d'une course « en cours » |

### Le cycle de vie d'une course

```
                 passager commande
                        │
                        ▼
                  ┌───────────┐   5 min sans chauffeur (timeout)
                  │ requested │ ─────────────────────────────────┐
                  └─────┬─────┘   passager annule                │
     chauffeur accepte  │  ▲                                     │
                        ▼  │ chauffeur annule                    │
                  ┌───────────┐ (la course retourne              │
                  │ accepted  │  dans la file d'attente)         │
                  └─────┬─────┘                                  │
     chauffeur "arrivé" │   passager annule ─────────────────────┤
                        ▼                                        │
                  ┌───────────┐                                  │
                  │ arrived   │ ─────────────────────────────────┤
                  └─────┬─────┘                                  │
    chauffeur "démarrer"│                                        ▼
                        ▼                                  ┌───────────┐
                  ┌─────────────┐   admin annule           │ cancelled │
                  │ in_progress │ ───────────────────────► └───────────┘
                  └─────┬───────┘   (admin peut annuler à toute étape active)
   chauffeur "terminer" │
                        ▼
                  ┌───────────┐
                  │ completed │ ──► le passager peut noter (1 à 5 ★ + commentaire)
                  └───────────┘
```

### Fonctions

| Fonction | Rôle |
|---|---|
| `SELECT_RIDE` + `toRide(row)` | Une seule requête SQL qui joint la course, le passager, le chauffeur et sa moto ; `toRide` la transforme en objet `Ride` propre (camelCase, `pickup`/`dropoff` regroupés, note moyenne calculée). |
| `getRide(id)` / `listRides(where, params, limit)` | Lecture d'une ou plusieurs courses. `listRides` est réutilisée partout (historique, admin, etc.) avec des conditions différentes. |
| `expireStaleRequests()` | Annule les demandes `requested` de plus de 5 min (`cancelled_by = 'timeout'`) et prévient les intéressés. **Il n'y a pas de minuterie** : cette fonction est appelée au début de `getActiveRide`, `listAvailableRides`, `getAdminCounts`, `listAdminRides`. Comme les écrans interrogent l'API au moins toutes les 15 s, le ménage se fait naturellement. |
| `getActiveRide(user)` | La course en cours du passager ou du chauffeur (ou `null`). |
| `getRideToRate(passengerId)` | La dernière course terminée pas encore notée (pour afficher l'écran « Vous êtes arrivé ! »). |
| `listAvailableRides(driverId)` | Demandes en attente, avec la distance jusqu'au chauffeur, filtrées à 10 km et triées de la plus proche à la plus lointaine. **Le numéro du passager est masqué** (`phone: ""`) tant que la course n'est pas acceptée. |
| `createRide(passenger, pickup, dropoff)` | Vérifie les lieux, **recalcule le prix côté serveur** avec `estimateTrip` (le prix envoyé par le navigateur est ignoré : impossible de tricher), refuse < 0,2 km ou > 40 km, refuse s'il y a déjà une course en cours, insère, puis prévient les chauffeurs. |
| `applyAction(rideId, user, action)` | Le chef d'orchestre des étapes (voir ci-dessous). |
| `adminCancelRide(rideId)` | Annulation par l'admin (`cancelled_by = 'admin'`). |
| `rateRide(rideId, passenger, rating, comment)` | Enregistre la note (1–5) et met à jour `rating_sum`/`rating_count` du chauffeur dans une transaction. |
| `notify(ride, driverId?)` | Envoie l'événement `ride` au passager, au chauffeur et, si un chauffeur vient d'annuler, à lui aussi. |

### `applyAction` : la protection contre les « courses » simultanées

Pour accepter, la requête SQL est :
```sql
UPDATE rides SET status = 'accepted', driver_id = ? ... WHERE id = ? AND status = 'requested'
```
Si deux chauffeurs cliquent en même temps, le premier change le statut ; pour le second, la condition `status = 'requested'` n'est plus vraie, `res.changes === 0`, et il reçoit `409 Cette course n'est plus disponible.` C'est **la base de données** qui arbitre, sans risque d'attribuer la course deux fois.

Le même principe (`WHERE ... AND status = <étape attendue>`) protège les étapes `arrive`, `start`, `complete`, décrites dans le tableau `steps` : `[statut de départ, statut d'arrivée, colonne de date à remplir]`.

Avant d'accepter, le chauffeur doit : être `approved`, avoir un **abonnement actif** (sinon `402`), être **en ligne**, ne pas avoir déjà une course.

---

## `drivers.ts` — les chauffeurs

| Fonction | Rôle |
|---|---|
| `getDriverProfile(userId)` | Profil du chauffeur (plaque, moto, permis, statut, en ligne, position, note, abonnement). Appelle d'abord `enforceSubscription` pour mettre hors ligne un chauffeur dont l'abonnement vient d'expirer. |
| `setDriverOnline(user, online)` | Passer en ligne exige d'être validé **et** abonné. Passer hors ligne est refusé pendant une course. |
| `updateDriverLocation(user, lat, lng)` | Enregistre la position et, si une course est en cours, envoie l'événement `location` **directement au passager** (sans passer par la base pour lui). |
| `setDriverStatus(userId, status)` | Admin : valider (`approved`) ou suspendre (`suspended`, ce qui met aussi hors ligne). Prévient le chauffeur (`profile`) et les autres chauffeurs. |

---

## `subscriptions.ts` — les abonnements

**Idée centrale** : la date de fin d'abonnement est stockée dans `drivers.subscription_until`. La table `subscriptions` garde l'**historique** (demandes et paiements).

| Fonction | Rôle |
|---|---|
| `isSubscriptionActive(until)` | Vrai si la date de fin est dans le futur. |
| `extend(...)` (interne) | Marque une ligne `paid` et **prolonge** : si l'abonnement est encore actif, la nouvelle période commence à sa fin (le chauffeur ne perd aucun jour) ; sinon maintenant. |
| `getDriverSubscription(driverId)` | État pour l'écran chauffeur : date de fin, actif, jours restants, demande en attente, historique payé. |
| `requestSubscription(driverId, plan)` | Le chauffeur choisit Mensuel ou Annuel → ligne `pending`. Une seule demande en attente à la fois. |
| `cancelSubscriptionRequest(driverId)` | Le chauffeur annule sa demande. |
| `reviewSubscriptionRequest(id, approve)` | Admin : « Paiement reçu » (→ `extend`) ou refus (→ `rejected`). |
| `recordSubscriptionPayment(driverId, plan)` | Admin encaisse directement depuis la liste des chauffeurs, sans demande préalable. |
| `deleteSubscription(id)` | Supprime une ligne ; si elle était payée, **retire sa durée** de la date de fin. |
| `enforceSubscription(driverId)` | Met hors ligne un chauffeur expiré, sauf s'il est en pleine course. |
| `getSubscriptionStats()` / `listSubscriptionsForAdmin()` | Chiffres et liste pour l'admin. |

Statuts d'une ligne `subscriptions` : `pending` (demandée) → `paid` (payée) ou `rejected` (refusée par l'admin) ou `cancelled` (annulée par le chauffeur ou remplacée).

---

## `accounts.ts` — profils et comptes

| Fonction | Rôle |
|---|---|
| `updateProfile(user, body)` | Modifie nom, téléphone, e-mail (et plaque, moto, **permis** pour un chauffeur). **Si un chauffeur validé change de moto ou de permis, il repasse `pending`** et hors ligne : l'équipe doit revérifier. Renvoie `{ revalidation: true }` dans ce cas. |
| `createGuestPassenger(body)` | Crée un **passager invité** : `guest = 1`, vrai numéro dans `guest_phone`, et dans `phone` une valeur fictive unique (`invite-…`). Ainsi le numéro ne « réserve » aucun compte, et **personne ne peut retrouver les courses d'un invité en connaissant son numéro** : seul le téléphone qui a commandé (cookie) y a accès. PIN aléatoire inconnu de tous. |
| `convertGuest(userId, body)` | Transforme l'invité en vrai compte : vrai numéro dans `phone` (s'il est libre), PIN choisi, `guest = 0`. Les courses restent attachées au même compte. |
| `changePin(userId, current, new)` | Exige l'ancien PIN correct. |
| `deleteMemberAccount(userId, role)` | Supprime un passager/chauffeur. **Sans courses** : effacement complet. **Avec courses** : **anonymisation** (nom → « Passager supprimé », téléphone → `supprime-<id>` pour libérer le vrai numéro, PIN aléatoire, `blocked = 1`, `deleted_at` rempli). Les courses restent pour l'historique et les statistiques. Refusé s'il y a une course en cours. |
| `requirePrincipal(user)` | Lève `403` si l'admin n'est pas l'**administrateur principal**. |
| `listAdmins` / `createAdmin` / `setAdminBlocked` / `deleteAdmin` | Gestion de l'équipe admin. Le principal ne peut pas agir sur son propre compte (`getOtherAdmin`). |
| `transferPrincipal(principal, adminId)` | Cède le rôle de principal ; l'ancien reste admin. |

---

## `admin.ts` — le tableau de bord

| Fonction | Rôle |
|---|---|
| `getAdminCounts()` | Les nombres des **pastilles** du menu : chauffeurs à valider, abonnements à confirmer, messages non lus, courses actives. |
| `getAdminOverview()` | Chiffres du jour et totaux, courses des **7 derniers jours** (pour le graphique), chauffeurs en ligne (pour la carte), courses actives. |
| `listAdminRides(filters)` | Courses filtrées par statut, chauffeur, passager ou texte (n°, nom, téléphone, lieu). Les conditions sont construites dans un tableau `where[]` et les valeurs passées en **paramètres `?`** (jamais collées dans le SQL : protection contre l'injection SQL). |
| `listAdminDrivers(filters)` | Chauffeurs avec note, nombre de courses et gains calculés par sous-requêtes. Filtres : à valider, validés, en ligne, sans abonnement, suspendus. Les `pending` en premier. |
| `listAdminPassengers(filters)` | Passagers avec statistiques (courses, annulations, dépenses, dernière course). |
| `setPassengerBlocked(userId, blocked)` | Bloquer = `blocked = 1` + suppression des sessions (déconnexion immédiate). |
| `deleteRide`, `deleteReview`, `deleteMessage` | Suppressions. `removeRatingFromDriver` retire la note de la moyenne du chauffeur. |

La date du jour est calculée en UTC (`toISOString().slice(0, 10)`) : c'est correct car la Côte d'Ivoire est à UTC+0.

---

## `public.ts` — ce qui est visible sans connexion

| Fonction | Rôle |
|---|---|
| `getPublicReviews()` | Note moyenne, répartition 1→5 ★ et 6 derniers commentaires non masqués. Le nom est raccourci par `shortName` : « Awa Koné » → « Awa K. » (vie privée). |
| `createContactMessage(ip, body)` | Enregistre un message du formulaire. **Anti-spam** : la `Map recentByIp` garde les heures d'envoi par IP ; au-delà de 3 en 10 min → `429`. (En mémoire : remise à zéro au redémarrage.) |
| `listContactMessages`, `setMessageHandled`, `setReviewHidden`, `listReviewsForAdmin` | Utilisées par l'admin. |

---

## `mailer.ts` et `emails/welcome.ts` — les e-mails

- **`mailer.ts`** : si `SMTP_USER` et `SMTP_PASS` sont définis, crée un « transporteur » nodemailer vers Gmail. Sinon, `sendMail` **enregistre l'e-mail en fichier HTML** dans `Backend/data/emails/` (pratique pour voir le rendu sans rien envoyer).
  - `sendMailInBackground` lance l'envoi **sans l'attendre** et se contente d'afficher l'erreur éventuelle : une panne Gmail ne bloque jamais une inscription.
  - Les espaces du mot de passe d'application sont retirés (`replace(/\s/g, "")`) car Google l'affiche par groupes de 4.
- **`emails/welcome.ts`** : construit l'e-mail de bienvenue (HTML + version texte). Mise en page en **tableaux HTML** avec styles **en ligne** : c'est la seule méthode fiable pour les logiciels de messagerie (Gmail, Outlook ignorent souvent les feuilles de style). `escapeHtml` protège contre un nom contenant du HTML. Le contenu diffère pour un passager (comment commander, tarif) et un chauffeur (validation, abonnement).

---

## Les fichiers partagés : `types.ts`, `pricing.ts`, `site.ts`

Ces fichiers existent en **plusieurs exemplaires** : `Backend/src/`, `Application/src/lib/` et (pour `types.ts` et `pricing.ts`) `Administration/src/lib/`.

**Pourquoi deux copies ?** Les deux projets sont indépendants (chacun son `package.json`). Les partager vraiment nécessiterait un troisième paquet commun, ce qui complique l'installation. Pour un projet de cette taille, la copie est un compromis acceptable, à condition de **les garder synchronisées** (un commentaire en tête de chaque fichier le rappelle).

- **`pricing.ts`** (identiques aujourd'hui) :
  - `PRICING` : 50 FCFA/km, minimum 200 FCFA, arrondi aux 25 FCFA supérieurs, vitesse moyenne 25 km/h, facteur route ×1,3.
  - `SUBSCRIPTION_PLANS` : Mensuel 1 000 FCFA (1 mois), Annuel 10 000 FCFA (12 mois).
  - `haversineKm(a, b)` : distance à vol d'oiseau entre deux points GPS (formule de haversine, rayon terrestre 6 371 km).
  - `estimateTrip(a, b)` : distance ×1,3 arrondie au dixième, prix, durée estimée (3 min minimum).
  - `formatFcfa(n)` : `1500` → `"1 500 FCFA"`.
  - L'Application l'utilise pour **afficher** le prix avant la commande ; le Backend pour **décider** du prix réel. Même formule des deux côtés = l'utilisateur paie exactement ce qu'il a vu.
- **`types.ts`** : la partie commune est identique ; les versions des sites ajoutent des types propres à l'admin et aux abonnements (`AdminDriver`, `DriverSubscription`, etc.).
- **`site.ts`** : coordonnées de contact. ⚠️ Les deux versions **ne sont pas identiques** actuellement (voir [09-modifier-et-points-d-attention.md](09-modifier-et-points-d-attention.md)).

---

## `scripts/reset-admin-pin.ts` — PIN administrateur oublié

Outil lancé **à la main** dans le dossier `Backend` :

```bash
npm run reset-admin-pin -- 4821
```

1. Vérifie que le nouveau PIN a 4 chiffres.
2. Trouve l'**administrateur principal** (`is_principal = 1`).
3. Remplace l'empreinte de son PIN (`hashPin`), le débloque s'il était bloqué, ferme toutes ses sessions.
4. Affiche son nom et son numéro de connexion.

**Pourquoi un script et pas un bouton « PIN oublié » ?** Les PIN sont hachés : on ne peut pas les relire, seulement en définir un nouveau. Sans envoi de code par SMS, n'importe qui pourrait réinitialiser le PIN d'un autre. Le script exige d'avoir accès au **serveur** lui-même, ce qui prouve qu'on est l'exploitant.
