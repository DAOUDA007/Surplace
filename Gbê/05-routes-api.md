# 5. Toutes les routes de l'API

Toutes déclarées dans `Backend/src/server.ts`, toutes préfixées par `/api`.
Depuis le navigateur, on les appelle sur le port du site (`http://localhost:3000/api/...`) ; Next.js les relaie au Backend.

**Légende « Accès »** : 🌐 public · 👤 tout utilisateur connecté · 🙋 passager · 🏍️ chauffeur · 🛡️ admin · 👑 admin principal

Toutes les réponses sont en JSON. En cas d'erreur : `{ "error": "message en français" }` avec le code HTTP adapté.

Convention : les lectures utilisent `GET`, **toutes** les modifications utilisent `POST` (y compris les suppressions, avec `/delete` dans l'adresse). C'est un choix de simplicité : la fonction `api()` du Frontend n'a besoin que de deux méthodes.

## Authentification et profil

| Méthode | Adresse | Accès | Corps envoyé | Réponse / Effet | Code métier |
|---|---|---|---|---|---|
| POST | `/auth/register` | 🌐 | `role, name, phone, pin, email?` (+ `plate, motoModel` si chauffeur) | Crée le compte, connecte, `{ redirect }` | `server.ts` |
| POST | `/auth/login` | 🌐 | `phone, pin` | Connecte, `{ redirect }` | `server.ts` |
| POST | `/auth/logout` | 🌐 | — | Déconnecte, `{ redirect: "/" }` | `auth.ts › destroySession` |
| GET | `/me` | 👤 | — | `{ user, driver }` (`driver` = profil chauffeur ou `null`) | `drivers.ts › getDriverProfile` |
| POST | `/me/profile` | 👤 | `name, phone, email?` (+ `plate, motoModel`) | `{ revalidation }` | `accounts.ts › updateProfile` |
| POST | `/me/pin` | 👤 | `currentPin, newPin` | `{ ok }` | `accounts.ts › changePin` |

## Courses

| Méthode | Adresse | Accès | Corps | Réponse / Effet | Code métier |
|---|---|---|---|---|---|
| GET | `/rides` | 👤 | — | `{ rides }` : 200 dernières courses de l'utilisateur | `rides.ts › listRides` |
| POST | `/rides` | 🙋 | `pickup: {label,lat,lng}, dropoff: {...}` | `{ ride }` : course créée | `rides.ts › createRide` |
| GET | `/rides/current` | 👤 | — | `{ ride, rideToRate }` : course en cours, et course à noter (passager) | `rides.ts › getActiveRide, getRideToRate` |
| POST | `/rides/:id/action` | 🙋🏍️ | `action`: `accept` · `arrive` · `start` · `complete` · `cancel` | `{ ride }` | `rides.ts › applyAction` |
| POST | `/rides/:id/rate` | 🙋 | `rating` (1–5), `comment?` | `{ ride }` | `rides.ts › rateRide` |

## Chauffeur

| Méthode | Adresse | Accès | Corps | Réponse / Effet | Code métier |
|---|---|---|---|---|---|
| POST | `/driver/status` | 🏍️ | `online: true/false` | `{ driver }` | `drivers.ts › setDriverOnline` |
| POST | `/driver/location` | 🏍️ | `lat, lng` | `{ ok }` + événement `location` au passager | `drivers.ts › updateDriverLocation` |
| GET | `/driver/available` | 🏍️ | — | `{ rides }` : demandes à ≤ 10 km (vide si hors ligne ou non validé) | `rides.ts › listAvailableRides` |
| GET | `/driver/subscription` | 🏍️ | — | État de l'abonnement | `subscriptions.ts › getDriverSubscription` |
| POST | `/driver/subscription` | 🏍️ | `plan`: `monthly` · `yearly` | Nouvel état | `subscriptions.ts › requestSubscription` |
| POST | `/driver/subscription/cancel` | 🏍️ | — | Nouvel état | `subscriptions.ts › cancelSubscriptionRequest` |

## Administration — lectures

| Méthode | Adresse | Accès | Paramètres d'URL | Réponse | Code métier |
|---|---|---|---|---|---|
| GET | `/admin/counts` | 🛡️ | — | Nombres des pastilles du menu | `admin.ts › getAdminCounts` |
| GET | `/admin/overview` | 🛡️ | — | `{ stats, days, onlineDrivers, activeRides }` | `admin.ts › getAdminOverview` |
| GET | `/admin/rides` | 🛡️ | `status`, `q`, `driverId`, `passengerId` | `{ rides }` | `admin.ts › listAdminRides` |
| GET | `/admin/drivers` | 🛡️ | `status`, `q` | `{ drivers }` | `admin.ts › listAdminDrivers` |
| GET | `/admin/passengers` | 🛡️ | `status`, `q` | `{ passengers }` | `admin.ts › listAdminPassengers` |
| GET | `/admin/subscriptions` | 🛡️ | — | `{ stats, subscriptions }` | `admin.ts › listAdminSubscriptions` |
| GET | `/admin/reviews` | 🛡️ | — | `{ reviews }` | `public.ts › listReviewsForAdmin` |
| GET | `/admin/messages` | 🛡️ | — | `{ messages }` | `public.ts › listContactMessages` |
| GET | `/admin/admins` | 🛡️ | — | `{ admins }` | `accounts.ts › listAdmins` |

Les paramètres d'URL s'écrivent ainsi : `/api/admin/rides?status=active&q=Koné`. Les fonctions `queryText` et `queryId` de `server.ts` les nettoient (texte ou nombre, sinon ignorés).

## Administration — actions

| Méthode | Adresse | Accès | Corps | Effet | Code métier |
|---|---|---|---|---|---|
| POST | `/admin/rides/:id/cancel` | 🛡️ | — | Annule une course active | `rides.ts › adminCancelRide` |
| POST | `/admin/drivers/:id` | 🛡️ | `status`: `approved` · `suspended` | Valide ou suspend | `drivers.ts › setDriverStatus` |
| POST | `/admin/drivers/:id/subscription` | 🛡️ | `plan` | Encaisse un abonnement directement | `subscriptions.ts › recordSubscriptionPayment` |
| POST | `/admin/subscriptions/:id` | 🛡️ | `approve: true/false` | Paiement reçu / refus | `subscriptions.ts › reviewSubscriptionRequest` |
| POST | `/admin/passengers/:id/block` | 🛡️ | `blocked: true/false` | Bloque / débloque | `admin.ts › setPassengerBlocked` |
| POST | `/admin/reviews/:id` | 🛡️ | `hidden: true/false` | Masque / affiche un avis | `public.ts › setReviewHidden` |
| POST | `/admin/messages/:id` | 🛡️ | `handled: true/false` | Marque traité / non traité | `public.ts › setMessageHandled` |
| POST | `/admin/rides/:id/delete` | 🛡️ | — | Supprime une course terminée/annulée | `admin.ts › deleteRide` |
| POST | `/admin/reviews/:id/delete` | 🛡️ | — | Supprime note + commentaire | `admin.ts › deleteReview` |
| POST | `/admin/messages/:id/delete` | 🛡️ | — | Supprime un message | `admin.ts › deleteMessage` |
| POST | `/admin/subscriptions/:id/delete` | 🛡️ | — | Supprime une demande/un paiement | `subscriptions.ts › deleteSubscription` |
| POST | `/admin/passengers/:id/delete` | 🛡️ | — | Supprime ou anonymise | `accounts.ts › deleteMemberAccount` |
| POST | `/admin/drivers/:id/delete` | 🛡️ | — | Supprime ou anonymise | `accounts.ts › deleteMemberAccount` |
| POST | `/admin/admins` | 👑 | `name, phone, pin` | Ajoute un admin | `accounts.ts › createAdmin` |
| POST | `/admin/admins/:id/block` | 👑 | `blocked: true/false` | Suspend / réactive | `accounts.ts › setAdminBlocked` |
| POST | `/admin/admins/:id/delete` | 👑 | — | Supprime un admin | `accounts.ts › deleteAdmin` |
| POST | `/admin/admins/:id/transfer` | 👑 | — | Cède le rôle principal | `accounts.ts › transferPrincipal` |

## Public et technique

| Méthode | Adresse | Accès | Effet | Code métier |
|---|---|---|---|---|
| GET | `/public/reviews` | 🌐 | Note moyenne, répartition, derniers avis | `public.ts › getPublicReviews` |
| POST | `/public/contact` | 🌐 | Enregistre un message (`name, phone, subject, message`), 3 max / 10 min / IP | `public.ts › createContactMessage` |
| GET | `/events` | 👤 | Flux temps réel (Server-Sent Events) | `server.ts` + `events.ts` |
| GET | `/health` | 🌐 | `{ ok: true }` | `server.ts` |

## Tester une route à la main

Le Backend étant lancé, dans un navigateur :
- `http://localhost:4000/api/health` → `{"ok":true}`
- `http://localhost:3000/api/public/reviews` → les avis (passe par le proxy Next.js)
- `http://localhost:3000/api/me` → `401` si vous n'êtes pas connecté, vos infos sinon (le cookie est envoyé automatiquement)
