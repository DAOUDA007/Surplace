# 8. Parcours complets, de bout en bout

Chaque scénario suit le chemin exact dans le code, du clic jusqu'à la base de données et retour. C'est la meilleure façon de voir comment les fichiers s'enchaînent.

---

## A. `npm run dev` : que se passe-t-il au démarrage ?

```
npm run dev  (racine)
 └─ concurrently lance 2 commandes en parallèle :
     ├─ [api]  npm run dev --prefix Backend   →  tsx watch src/server.ts
     │          1. env.ts      lit Backend/.env
     │          2. db.ts       ouvre/crée data/surplace.db, tables, migrations, comptes démo
     │          3. mailer.ts   prépare Gmail (ou mode « aperçu fichier »)
     │          4. server.ts   déclare les routes, écoute le port 4000
     │          → « SURPLACE API prête sur http://localhost:4000 »
     │
     ├─ [app]   npm run dev --prefix Application    →  next dev --turbopack -p 3000
     │           lit next.config.ts (règle /api/* → localhost:4000), écoute le port 3000
     │
     └─ [admin] npm run dev --prefix Administration →  next dev --turbopack -p 3001
                 même règle /api/*, écoute le port 3001
                 Les pages sont compilées à leur première visite (de quelques secondes à plusieurs minutes selon la machine).
```

`tsx watch` redémarre le Backend à chaque sauvegarde d'un fichier `Backend/src/`. Chaque site Next.js met à jour la page ouverte à chaque sauvegarde d'un de ses fichiers (« Fast Refresh »).

---

## B. Inscription d'un passager

```
NAVIGATEUR  /inscription
 │  RegisterForm (components/AuthForms.tsx) : l'utilisateur remplit et valide
 │  useSubmit → api("/api/auth/register", { role, name, phone, email, pin })      lib/api.ts
 ▼
NEXT.JS (Application)  next.config.ts : /api/auth/register → http://localhost:4000/api/auth/register
 ▼
BACKEND  server.ts  POST /auth/register
 │  role ≠ "driver" → "passenger"
 │  requiredText(name) · normalizePhone(phone) · validatePin(pin) · optionalEmail(email)   validation.ts
 │  numéro déjà pris ? → 409
 │  transaction : INSERT INTO users (… hashPin(pin) …)                            password.ts, db.ts
 │  createSession(res, userId)  → INSERT INTO sessions + cookie surplace_session  auth.ts
 │  e-mail ? → sendMailInBackground(welcomeEmail(...))                            mailer.ts, emails/welcome.ts
 │  réponse { redirect: "/passager" }
 ▼
NAVIGATEUR  reçoit le cookie (httpOnly) + la réponse
 │  router.replace("/passager") ; router.refresh()
 ▼
Parcours C (ouverture d'une page protégée)
```

---

## C. Ouverture d'une page protégée (`/passager`)

```
NAVIGATEUR  demande GET /passager   (envoie le cookie)
 ▼
NEXT.JS (serveur)
 │  app/layout.tsx           → <html>, police, script de thème
 │  app/passager/page.tsx    → requirePageUser("passenger")                    lib/server.ts
 │     backendGet("/me") : fetch http://localhost:4000/api/me  + en-tête cookie recopié
 │        ▼
 │     BACKEND  GET /me → requireUser → getCurrentUser (sessions JOIN users)    auth.ts
 │        ◄── { user, driver: null }
 │     pas de session → redirect("/connexion")
 │     rôle driver → redirect("/chauffeur") ; admin → redirect(ADMIN_URL, site d'Administration)
 │  renvoie <PassengerApp user={user} />
 ▼
NAVIGATEUR  reçoit le HTML + le JavaScript de PassengerApp
 │  PassengerApp démarre : refresh() → /api/rides/current
 │                         useServerEvents → ouvre /api/events
 │                         locate() → GPS
 ▼  l'écran est prêt
```

---

## D. Une course complète (passager + chauffeur)

Prérequis : le chauffeur est sur `/chauffeur`, validé, abonné, **en ligne**. Tous deux ont un flux `/api/events` ouvert.

### 1. Le passager choisit son trajet

- Départ : position GPS (`locateUser` dans `lib/geolocation.ts`), nom par `reverseGeocode` (Nominatim).
- Destination : recherche dans `PlaceSearch` (lieux fréquents + Nominatim) ou clic sur la carte.
- Prix affiché : `estimateTrip(pickup, dropoff)` de `lib/pricing.ts`, **calculé dans le navigateur**, sans appel serveur.

### 2. Le passager commande

```
PassengerApp.order()  →  POST /api/rides { pickup, dropoff }
BACKEND  requireUser(req, "passenger")
         createRide()                                              rides.ts
           validPlace() ×2
           estimateTrip()      ← le prix est RECALCULÉ ici (le navigateur n'envoie pas de prix)
           0,2 km ≤ distance ≤ 40 km ?  course déjà en cours ?
           INSERT INTO rides (status 'requested', …)
           publish("drivers", { type: "available-rides" })        events.ts
         ◄── { ride }
PassengerApp : setRide(ride) → panneau « Recherche d'un chauffeur… » + chronomètre
```

### 3. Le chauffeur est prévenu

```
events.ts : bus.emit("drivers", …)
server.ts /events : chaque chauffeur connecté est abonné à "drivers"
           → res.write("data: {\"type\":\"available-rides\"}\n\n")
NAVIGATEUR chauffeur : useServerEvents reçoit l'événement
DriverApp : loadAvailable() → GET /api/driver/available
BACKEND   listAvailableRides(driverId)  (distance, filtre 10 km, tri, téléphone masqué)
DriverApp : la demande apparaît dans la liste + marqueur orange « ! » sur la carte
```

### 4. Le chauffeur accepte

```
DriverApp.accept(id)  →  POST /api/rides/12/action { action: "accept" }
BACKEND applyAction()                                               rides.ts
          chauffeur approved ? abonnement actif ? en ligne ? pas déjà occupé ?
          UPDATE rides SET status='accepted', driver_id=… WHERE id=12 AND status='requested'
             (0 ligne modifiée = un autre chauffeur a été plus rapide → 409)
          notify() → événement "ride" au passager et au chauffeur
          publish("drivers", "available-rides") → la demande disparaît chez les autres chauffeurs
PASSAGER : événement "ride" → refresh() → panneau « Votre chauffeur arrive dans ~N min »
           avec nom, moto, plaque, note, bouton 📞 (le numéro est maintenant visible)
```

### 5. Le chauffeur se déplace (suivi en direct)

```
DriverApp : position change (GPS réel ou mode démo toutes les 2 s)
         → POST /api/driver/location { lat, lng }   (au plus toutes les 1,5 s)
BACKEND updateDriverLocation()                                      drivers.ts
         UPDATE drivers SET lat, lng …
         course active ? → publishToUser(passager, { type: "location", rideId, lat, lng })
PASSAGER : événement "location" → setDriverPos() → la 🏍️ bouge, la carte se recadre,
           le temps d'arrivée est recalculé — sans aucun appel à l'API
```

### 6. Arrivée, départ, fin

| Bouton chauffeur | Action | Transition | Le passager voit |
|---|---|---|---|
| « Je suis arrivé » | `arrive` | accepted → arrived (`arrived_at`) | « Votre chauffeur est arrivé ! » |
| « Démarrer la course » | `start` | arrived → in_progress (`started_at`) | « En route · arrivée dans ~N min » ; le bouton Annuler disparaît |
| « Terminer la course » | `complete` | in_progress → completed (`completed_at`) | Écran 🎉 « Réglez X FCFA en espèces » + étoiles |

Le lien « 🧭 GPS » de `CurrentRide` ouvre Google Maps vers la cible actuelle (départ, puis destination). Côté chauffeur, après « Terminer la course » : écran ✅ « Encaissez X FCFA », gains du jour mis à jour (`loadToday`).

### 7. La note

```
RateRide.submit() → POST /api/rides/12/rate { rating: 5, comment: "Très bien" }
BACKEND rateRide() : transaction
          UPDATE rides SET rating, comment
          UPDATE drivers SET rating_sum += 5, rating_count += 1
La note apparaît ensuite dans la moyenne du chauffeur et, avec commentaire, sur la page d'accueil.
```

« Plus tard » masque l'écran pour cette session ; il réapparaîtra au prochain chargement tant que la course n'est pas notée (`getRideToRate`).

### Les cas particuliers

| Situation | Ce qui se passe | Code |
|---|---|---|
| Personne n'accepte en 5 min | À la prochaine interrogation (≤ 15 s), `expireStaleRequests` annule (`cancelled_by='timeout'`). Le passager voit « Aucun chauffeur n'a accepté votre demande. » | `rides.ts`, `PassengerApp.refresh` |
| Le chauffeur annule | La course **redevient `requested`** (sans chauffeur, chronomètre remis à zéro). Le passager voit « Le chauffeur a annulé. Nous recherchons un autre chauffeur… » | `applyAction` (cancel, chauffeur) |
| Le passager annule | `cancelled_by='passenger'`. Le chauffeur voit « Le passager a annulé la course. » | `applyAction`, `DriverApp.loadRide` |
| L'admin annule | `cancelled_by='admin'`, les deux sont prévenus | `adminCancelRide` |
| Le flux temps réel est coupé (réseau) | Les écrans continuent d'interroger l'API toutes les 15 s ; à la reconnexion, tout est rechargé | `setInterval(refresh, 15_000)`, `onReconnect` |

---

## E. Un nouveau chauffeur, de l'inscription à sa première course

1. **Inscription** avec plaque, moto et **numéro de permis** → ligne `drivers` en statut `pending`, sans abonnement.
2. `/chauffeur` affiche `AccountPending` : « en attente de validation ».
3. **Admin** (site d'Administration) → `/chauffeurs` (pastille rouge « 1 ») → vérifie la moto et le permis (colonne « Moto et permis ») → « Valider » → `POST /api/admin/drivers/:id { status: "approved" }` → `setDriverStatus` → événement `profile` au chauffeur.
4. L'écran du chauffeur se met à jour **instantanément** (`loadProfile`) : il voit l'écran normal, mais « Passer en ligne » renverra `402` tant qu'il n'est pas abonné.
5. **Abonnement** : le chauffeur ouvre « Mon abonnement », choisit Mensuel → `POST /api/driver/subscription { plan: "monthly" }` → ligne `pending`.
6. Il paie SURPLACE (espèces, Mobile Money) **en dehors de l'application**.
7. **Admin** → `/abonnements` → « Paiement reçu » → `reviewSubscriptionRequest(id, true)` → `extend()` : `paid`, `subscription_until` = maintenant + 1 mois → événement `profile`.
   *(Variante : depuis `/chauffeurs`, « + Encaisser un abonnement » → `recordSubscriptionPayment`, sans demande préalable.)*
8. Le chauffeur peut passer en ligne et accepter des courses.
9. **À l'expiration** : la prochaine fois que son profil est lu (`getDriverProfile` → `enforceSubscription`), il est mis hors ligne, sauf s'il est en pleine course.

---

## F. Une action admin et le rafraîchissement des écrans

Exemple : bloquer un passager.

```
PassengersPage : <ActionButton confirm="Confirmer le blocage"> 
   1er clic → le bouton devient rouge « Confirmer… » (4 s)
   2e clic → action.run("b-7", "/api/admin/passengers/7/block", { blocked: true })     hooks/useAdminData.ts
BACKEND  requireUser(req, "admin") → setPassengerBlocked(7, true)                       admin.ts
           UPDATE users SET blocked = 1
           DELETE FROM sessions WHERE user_id = 7    → le passager est déconnecté
useAdminAction : succès → notifyAdminChange() → window.dispatchEvent("admin:changed")
   → tous les useAdminData de la page rechargent : la liste des passagers ET les pastilles du menu
Le passager bloqué : à sa prochaine requête, getCurrentUser renvoie null → 401 → redirigé vers /connexion,
   et s'il essaie de se reconnecter : « Ce compte a été suspendu. »
```

---

## G. Le thème clair / sombre

```
1. Chargement de n'importe quelle page :
   <head> exécute THEME_INIT_SCRIPT (lib/theme.ts) AVANT l'affichage
     localStorage["surplace-theme"] = "dark" ? ou "system"/absent + appareil en sombre ?
     → document.documentElement.classList.add("dark")
2. globals.css : .dark { --surface: #1c1917; … }  → toutes les classes bg-surface, text-ink… changent
   .dark .leaflet-tile-pane { filter: invert(1) … }  → la carte s'assombrit
3. Clic sur ThemeToggle : Clair → Sombre → Auto, enregistré dans localStorage, classe mise à jour
```

---

## H. L'e-mail de bienvenue

```
Inscription avec e-mail
 → server.ts : sendMailInBackground(welcomeEmail({ name, email, role }))   (non attendu)
 → emails/welcome.ts construit { to, subject, html, text } selon le rôle
 → mailer.ts sendMail :
      Gmail configuré (SMTP_USER + SMTP_PASS)  → envoi réel, console « envoyé à … »
      sinon                                     → Backend/data/emails/<date>_<adresse>.html
 → en cas d'échec : simple message dans la console, l'inscription a déjà réussi
```

---

## I. Le formulaire de contact

```
Application, accueil #contact → ContactForm → POST /api/public/contact { name, phone, subject, message }
BACKEND createContactMessage(req.ip, body)                                           public.ts
          req.ip = vraie IP du visiteur grâce à "trust proxy" (server.ts)
          plus de 3 messages en 10 min pour cette IP → 429
          INSERT INTO contact_messages
Administration : pastille « Messages » (+1) → /messages → Répondre / Marquer traité / Supprimer
```

---

## J. Commande sans compte (passager invité)

```
Accueil → « Commander une moto » → /passager                     (Application/src/app/passager/page.tsx)
  getSession() → null : PassengerApp reçoit user = null
  pas d'appel à /api/rides/current, pas de flux temps réel (signedIn = false)
  GPS, recherche de lieux, prix estimé : fonctionnent sans compte

« Commander » → le formulaire guestForm apparaît : nom + numéro
« Confirmer » → POST /api/rides/guest { name, phone, pickup, dropoff }
BACKEND  server.ts
   déjà connecté ? → 409 ;  plus de 5 commandes invitées / heure pour cette IP ? → 429
   transaction :
     createGuestPassenger()   users : guest = 1, guest_phone = vrai numéro, phone = « invite-… »   accounts.ts
     createRide()             course 'requested' + événement aux chauffeurs                       rides.ts
     (si la course est refusée, le compte invité est annulé aussi)
   createSession() → cookie : l'invité est reconnu sur ce téléphone
   ◄── { ride }
PassengerApp : setRide(ride) → « Recherche d'un chauffeur… » ; router.refresh()
   → la page reçoit maintenant user (isGuest: true) : suivi en direct, menu « Mes courses » / « Créer mon compte »
Chauffeur : après acceptation, il voit le VRAI numéro (COALESCE(guest_phone, phone)) et peut appeler
```

**Plus tard, l'invité crée son compte** : menu ☰ › « Créer mon compte » → `/inscription` (nom et numéro pré-remplis) → il choisit un PIN → `POST /api/auth/register` voit que l'appelant est un invité → `convertGuest` : même compte, vrai numéro dans `phone`, `guest = 0`. **Ses courses sont conservées**, et il peut se connecter sur n'importe quel appareil.

**Pourquoi ce n'est pas risqué** : quelqu'un qui connaît le numéro d'un invité ne peut rien en faire. Le numéro n'est pas un identifiant de connexion tant que l'invité n'a pas choisi de PIN, et commander avec ce numéro crée un **autre** compte invité, sans accès aux courses du premier.

---

## K. Connexion à l'Administration

```
http://localhost:3001/  →  (espace)/layout.tsx → requireAdmin() → pas d'admin → redirect("/connexion")
/connexion : LoginForm → POST /api/auth/login { phone, pin, space: "admin" }      (Administration)
BACKEND : PIN correct ? compte bloqué ? rôle = admin ?  (sinon 403 « Accès réservé aux administrateurs »)
          createSession() → { redirect: "/" }
LoginForm : router.replace("/") → vue d'ensemble, menu latéral, pastilles
```

Un admin qui essaie de se connecter sur l'**Application** reçoit « Les administrateurs se connectent sur l'espace d'administration. » Un passager ou un chauffeur qui essaie sur l'**Administration** reçoit « Accès réservé aux administrateurs SURPLACE. »

**PIN oublié** : dans `Backend/`, lancer `npm run reset-admin-pin -- 4821` (voir [03-backend.md](03-backend.md)).
