# 3. Le Backend, fichier par fichier

Dossier : `Backend/src/`. Langage : TypeScript exécuté par `tsx`. Serveur : Express. Base : SQLite via `better-sqlite3`.

## Comment une requête traverse le Backend

```
Requête HTTP  (ex. POST /api/rides  avec un cookie surplace_session)
   │
   ▼
app.ts
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

## `app.ts` et `server.ts` — les routes et le démarrage

- **`app.ts`** crée l'application Express et déclare **toutes les routes**. Il exporte `app` sans démarrer de serveur : les tests (`tests/api.test.ts`) peuvent ainsi lancer l'API sur un port libre, avec une base temporaire.
- **`server.ts`** (quelques lignes) : importe `app`, écoute le port 4000, affiche l'état des services (e-mail, SMS, itinéraires) et lance les **tâches de fond** (`jobs.ts` : attribution des courses toutes les 3 s, rappels, sauvegardes, ménage).

Points clés de `app.ts`, dans l'ordre du fichier :

1. **`import "./env"` en premier** : les autres modules lisent `process.env` dès leur chargement (par ex. `mailer.ts` crée le transporteur Gmail à l'import). Il faut donc que `.env` soit chargé avant.
2. **`app.disable("x-powered-by")`** : n'annonce pas « Express » dans les en-têtes (petite mesure de discrétion).
3. **`app.set("trust proxy", "loopback")`** : les requêtes arrivent du proxy Next.js (même machine). Ce réglage fait confiance à l'en-tête `X-Forwarded-For` pour connaître la **vraie IP** du visiteur. Utilisé par la limite anti-spam du formulaire de contact.
4. **`const api = express.Router()`** : toutes les routes sont attachées à ce routeur, lui-même monté sur `/api` à la fin (`app.use("/api", api)`).
5. Les routes, groupées par thème avec des commentaires `// --- Authentification ---`, `// --- Courses ---`, etc. La liste complète est dans [05-routes-api.md](05-routes-api.md).
6. **Les routes d'inscription et de connexion** sont écrites directement dans `app.ts` (pas dans un fichier métier) car elles sont courtes.
7. **`adminGet(path, droit, fn)`** et **`adminPost(path, droit, décrire, fn)`** : fabriquent les routes d'administration. Elles vérifient le **droit** du rôle de l'administrateur (`requireAdmin`), et `adminPost` inscrit chaque action au **journal** (`audit.ts`) en masquant les PIN et les images. `principalPost` ajoute la vérification « administrateur principal ».
8. **`fileRoute(fn)`** : renvoie un fichier (photo de document, export CSV) au lieu de JSON, avec `nosniff` et un cache privé.
9. **`/events`** : la route du temps réel (Server-Sent Events), expliquée plus bas. Les administrateurs écoutent aussi le canal `admins` (alertes d'urgence).
10. **`/health`** : renvoie `{ ok, uptimeSeconds }`, ou 503 si la base ne répond pas. Pour la surveillance (UptimeRobot…).
11. Avant tout : `apiRateLimit` (600 requêtes / min / IP) et une limite de taille de 8 Mo pour la seule route d'envoi de documents (100 ko ailleurs).
12. Une route « attrape-tout » renvoie `404 Route introuvable.` pour les adresses `/api/...` inconnues, puis `errorHandler` traite les erreurs.

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

## Les fichiers partagés : `types.ts`, `pricing.ts`, `site.ts`, `permissions.ts`

Ces fichiers sont **copiés depuis `Commun/lib/`** (voir [02-arborescence.md](02-arborescence.md)). Leur première ligne le rappelle : « ⚠️ Fichier copié depuis Commun/… ». On ne les modifie **jamais** dans `Backend/src/` : on modifie l'original dans `Commun/`, et la copie est refaite automatiquement à chaque `npm run dev` / `npm start` (script `scripts/sync-commun.mjs`).

- **`pricing.ts`** :
  - `PRICING`, `SUBSCRIPTION_PLANS`, `DEFAULT_SETTINGS` : valeurs **par défaut**. Les valeurs réellement appliquées se règlent dans l'administration (`settings.ts`).
  - `haversineKm(a, b)` : distance à vol d'oiseau entre deux points GPS.
  - `priceFor(distance, tarif, majoration %)` : base + km × prix, majoration, minimum, arrondi.
  - `activeSurcharges(réglages, date)` : majorations de nuit et de pluie en vigueur.
  - `estimateTrip(a, b, tarif)` : ligne droite × facteur route, prix, durée.
  - `formatFcfa(n)` : `1500` → `"1 500 FCFA"`.
- **`types.ts`** : tous les types de données (course, profil, réglages, documents, notifications, rapports…) et quelques constantes (`DOCUMENT_LABELS`, `REQUIRED_DOCUMENTS`, `COMPLAINT_CATEGORIES`).
- **`site.ts`** : coordonnées de SURPLACE, ligne d'urgence, numéros des secours (110, 111, 180, 185). La même version sert désormais à la page d'accueil et aux e-mails.
- **`permissions.ts`** : droits de chaque rôle d'administrateur (voir plus bas).

`config.ts` (propre au Backend) lit `SITE_URL`, `ADMIN_URL` et `NODE_ENV`.

---

## `scripts/` — outils lancés à la main

| Commande (dans `Backend/`) | Rôle |
|---|---|
| `npm run reset-admin-pin -- 4821` | Nouveau PIN pour l'administrateur principal, sans SMS (il faut avoir accès au serveur). Débloque le compte et ferme ses sessions. |
| `npm run backup` | Sauvegarde immédiate de la base dans `data/backups/`. |
| `npm test` | Tests automatiques (voir la fin de ce fichier). |

**Pourquoi un outil serveur en plus de « PIN oublié » par SMS ?** Si aucun fournisseur SMS n'est configuré, c'est la seule façon de récupérer l'accès admin. Avoir accès au serveur prouve qu'on est l'exploitant.

---

# Modules ajoutés (sécurité, confiance, confort, administration)

## `limits.ts` — limiter les abus

`RateLimiter(max, fenêtre)` compte des événements par clé (numéro, IP) sur une fenêtre glissante, en mémoire. `check(clé, message)` lève une erreur 429 (« Réessayez dans {minutes} min »), `hit` compte, `reset` remet à zéro.

| Limite | Valeur | Où |
|---|---|---|
| Connexion : échecs par numéro | 5 en 15 min | `/auth/login` (remis à zéro après une connexion réussie ou « PIN oublié ») |
| Connexion : échecs par IP | 30 en 15 min | `/auth/login` |
| Toute l'API | 600 requêtes / min / IP | `apiRateLimit` |
| Codes SMS | 3 / 15 min par numéro, 10 / h par IP | `otp.ts` |
| Commandes sans compte | 5 / h / IP | `/rides/guest` |
| Estimations de prix | 60 / min / IP | `/estimate` |
| Alertes d'urgence | 3 / 10 min par personne | `alerts.ts` |

Un PIN de 4 chiffres a 10 000 possibilités : avec 5 essais par quart d'heure, il faudrait plus de 20 jours pour toutes les essayer sur un numéro.

## `sms.ts` et `otp.ts` — vérification des numéros

- **`sms.ts`** : `sendSms(numéro, texte)`. Avec `SMS_PROVIDER=orange` (+ identifiants), envoi par l'API SMS d'Orange (jeton OAuth gardé en mémoire). Sinon, le SMS est affiché dans la console et enregistré dans `data/sms/` (rien n'est envoyé). `sendSmsInBackground` n'attend pas et ne fait jamais échouer l'action.
- **`otp.ts`** : codes à 6 chiffres, valables 10 minutes, 5 essais au plus, stockés **hachés** (comme les PIN) dans `otp_codes`.
  - `requestOtp(numéro, but, ip)` : `register` (refusé si le numéro a déjà un compte), `guest`, `reset` (ne révèle jamais si le numéro existe : aucun SMS ne part, mais la réponse est la même), `phone` (changement de numéro).
  - `verifyOtp(numéro, but, code)` : vérifie et **consomme** le code.
  - **`otpRequired`** = fournisseur SMS configuré **ou** développement. En développement, la réponse contient `devCode` (affiché à l'écran « Mode test »). En production sans fournisseur, la vérification est désactivée (sinon personne ne pourrait s'inscrire).

## `settings.ts` — tarifs et réglages modifiables

`getSettings()` lit la ligne `app` de la table `settings` (JSON) et complète avec `DEFAULT_SETTINGS` (gardé en mémoire). `updateSettings(valeurs)` vérifie chaque valeur (plages autorisées) et enregistre. Contenu : prix (au km, minimum, prise en charge, arrondi, facteur route, vitesse), majorations (nuit avec heures et %, pluie activable à la main), prix des abonnements, mode d'attribution, jours de parrainage, documents obligatoires.

## `routing.ts` — distance et prix d'un trajet

`estimateRoute(départ, arrivée, heure)` :
1. Si `OSRM_URL` est défini : demande l'itinéraire au serveur OSRM (4 s maximum, résultat gardé en cache) → distance **par la route**, durée, tracé simplifié (150 points).
2. Sinon (ou si OSRM ne répond pas) : ligne droite × facteur route.
3. Applique le tarif en vigueur et les majorations à l'**heure de prise en charge** (une réservation de nuit est majorée).

Utilisé par `/estimate` (affichage) **et** par la création de course (prix facturé) : le passager paie ce qu'il a vu.

## `documents.ts` — documents des chauffeurs

- Types : photo du visage, permis, carte grise, pièce d'identité (obligatoires), assurance (facultative). Permis et assurance ont une **date d'expiration**.
- `saveDocument` : reçoit l'image en « data URL » (JPEG/PNG/WebP, 5 Mo max, contenu vérifié par ses premiers octets), l'écrit dans `data/uploads/documents/` avec un nom aléatoire, remplace l'ancienne. Remplacer un document déjà vérifié remet un chauffeur validé « à valider ».
- `documentIssues` (manquants / expirés) et `documentsBlocking` (les mêmes, **seulement si** le réglage « Documents obligatoires » est activé) : utilisés pour passer en ligne, accepter une course et l'attribution automatique.
- Les fichiers ne sont servis qu'au chauffeur et à l'équipe ; la **photo** aussi au passager d'une course récente et à la page de suivi partagé.

## `dispatch.ts` — attribution automatique des courses

Mode **« au plus proche »** (par défaut) :
1. Une nouvelle demande (ou une réservation qui arrive à 15 min de l'heure prévue) est proposée au **chauffeur libre le plus proche** : en ligne, validé, abonné, documents en règle, position récente (< 10 min), sans course ni autre proposition en cours, à ≤ 10 km.
2. Il a `offerSeconds` (20 s) pour accepter ou refuser (`/rides/:id/decline`). Événement `offer`, notification push et son sur son téléphone.
3. Sans réponse ou en cas de refus, la course passe au suivant. Après `maxOffers` chauffeurs (3), ou s'il n'y a personne, elle est **ouverte à tous** les chauffeurs proches (premier qui accepte).

Mode **« ouverte à tous »** : chaque demande est tout de suite visible par tous.

`dispatchTick()` est appelée toutes les 3 s (`jobs.ts`) et juste après chaque commande. La table `ride_offers` garde chaque proposition et sa réponse (pour le taux d'acceptation). L'acceptation est protégée par une condition SQL (ouverte à tous **ou** proposée à ce chauffeur et encore valable) : impossible de « voler » une course proposée à un autre.

## `notifications.ts` et `push.ts` — prévenir les utilisateurs

- **`notifyUsers(ids, titre, texte, options)`** : notification dans l'application (cloche 🔔, table `notifications`), **push** sur le téléphone, et **SMS** en option.
- **`push.ts`** (paquet `web-push`) : clés VAPID dans `.env` ou créées une fois dans `data/vapid.json`. `sendPush(utilisateur, message)` envoie à tous ses appareils ; un abonnement expiré est oublié automatiquement.
- **Messages groupés** (`broadcast`) : à tous les chauffeurs, aux chauffeurs validés, aux chauffeurs en ligne, à tous les passagers, ou à tout le monde ; historique dans `broadcasts`.
- Notifications envoyées automatiquement : chauffeur trouvé, chauffeur arrivé, course terminée, aucun chauffeur, compte validé / suspendu, abonnement activé / refusé / bientôt expiré, document bientôt expiré, jours de parrainage offerts, réponse à une réclamation, annulation par l'équipe.

## `alerts.ts` — bouton d'urgence 🆘

`createAlert` enregistre l'alerte (position si disponible), crée si besoin le lien de suivi de la course, prévient l'équipe (événement `alert` sur le canal `admins` + push à tous les administrateurs) et envoie un **SMS à la personne à prévenir** (renseignée dans le profil) avec le lien de suivi et la position. `handleAlert` la marque traitée avec une note.

## `rides.ts` — nouveautés

- **Réservation à l'avance** (`scheduled_at`) : de 20 minutes à 7 jours. La course reste invisible des chauffeurs jusqu'à 15 min avant l'heure ; elle expire 5 min après l'heure sans chauffeur.
- **Commande pour un proche** (`rider_name`, `rider_phone`) : le chauffeur voit et appelle la personne transportée.
- **Note du passager** par le chauffeur (`ratePassenger`), visible des chauffeurs sur les demandes suivantes.
- **Partage** : `getShareToken` crée un jeton secret ; `trackSharedRide` renvoie ce qu'un proche peut voir (sans numéro), jusqu'à 1 h après la fin.
- `createRide` reçoit le trajet déjà calculé par `routing.ts` (fonction synchrone, utilisable dans une transaction).

## `places.ts`, `complaints.ts`, `referrals.ts`

- **Lieux fréquents** (table `places`, gérée dans l'administration, remplie au départ avec 16 lieux de Korhogo) ; **favoris** des passagers (`saved_places` : Maison, Travail, autres) ; **dernières destinations** (tirées des courses terminées).
- **Réclamations** : catégorie (objet perdu, prix, comportement, sécurité, itinéraire, autre), course concernée, réponse de l'équipe envoyée en notification.
- **Parrainage** : code `SPXXXXX` par chauffeur ; au premier abonnement payé du filleul, le parrain reçoit `referralDays` jours d'abonnement (`addSubscriptionDays`). Aucun argent n'est versé.

## `stats.ts` et `reports.ts`

- **Statistiques du chauffeur** : gains et courses du jour / de la semaine, **minutes en ligne** (table `driver_online_log`, une ligne par période en ligne), taux d'acceptation, répartition des notes, parrainage.
- **Zones demandées** : départs des 30 derniers jours regroupés en carrés d'environ 550 m (option : ± 1 h autour d'une heure).
- **Rapport mensuel** : courses, annulations, montants, abonnements encaissés, nouveaux comptes, chauffeurs actifs, note et distance moyennes, courbe par jour, heures de pointe, meilleurs chauffeurs, zones.
- **Exports CSV pour Excel** : séparateur « ; », encodage UTF-8 avec BOM (Excel en français l'ouvre correctement).

## `permissions.ts` et `audit.ts` — rôles et journal

| Rôle | Écrans |
|---|---|
| Accès complet | Tout |
| Opérations | Courses, chauffeurs, passagers, urgences, réclamations, lieux |
| Finances | Abonnements, tarifs et réglages, rapports, exports |
| Modération | Avis, messages, réclamations |

L'administrateur principal a toujours un accès complet et lui seul gère l'équipe. `audit(admin, action, cible, détails, ip)` inscrit chaque action dans `audit_log`.

## `backup.ts` et `jobs.ts` — tâches de fond

- **Sauvegardes** : copie cohérente de la base (API de sauvegarde de SQLite, sans arrêter le serveur) dans `data/backups/`, une fois par jour, gardée 30 jours.
- **`jobs.ts`** démarre : l'attribution des courses (3 s), les rappels toutes les heures (abonnement à J-3 et J-1 par notification, push et SMS ; permis ou assurance qui expire dans 30 jours) et le ménage des codes SMS.

---

## Les tests automatiques (`tests/api.test.ts`)

`npm test` (dans `Backend/` ou à la racine) lance l'API sur une **base temporaire** et rejoue 17 parcours réels par HTTP, avec le lanceur de tests intégré à Node :

- santé, configuration publique, estimation de prix ;
- inscription avec code SMS, blocage après 5 PIN faux, « PIN oublié » ;
- cloisonnement Application / Administration ;
- attribution automatique, refus, deuxième chauffeur validé et abonné qui accepte, course complète, notes croisées, statistiques ;
- commande sans compte puis création du compte (course conservée) ;
- réservation invisible des chauffeurs, réservation trop proche refusée ;
- tarifs modifiés appliqués et inscrits au journal ; rôle « modération » limité ;
- export Excel, alerte d'urgence, rapport du mois, sauvegarde ;
- copies de `Commun/` à jour.

Lancez-les après chaque modification du Backend : s'ils passent tous, les parcours principaux fonctionnent toujours.
