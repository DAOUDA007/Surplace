# 5. Toutes les routes de l'API

Déclarées dans `Backend/src/app.ts`, toutes préfixées par `/api`. Depuis le navigateur, on les appelle sur le site visité (`http://localhost:3000/api/...` pour l'Application, `http://localhost:3001/api/...` pour l'Administration) ; Next.js les relaie au Backend.

**Accès** : 🌐 public · 👤 tout utilisateur connecté · 🙋 passager · 🏍️ chauffeur · 🛡️ admin (avec le **droit** indiqué) · 👑 admin principal

Réponses en JSON ; en cas d'erreur `{ "error": "message en français" }`. Lectures en `GET`, toutes les modifications en `POST`. Toutes les routes sont limitées à 600 requêtes par minute et par adresse IP (`limits.ts`).

## Configuration, prix et codes SMS

| Méthode | Adresse | Accès | Envoi | Réponse / Effet |
|---|---|---|---|---|
| GET | `/public/config` | 🌐 | — | Réglages (tarifs, majorations, abonnements, attribution), majoration en cours, `otpRequired`, clé push, lieux fréquents |
| POST | `/estimate` | 🌐 | `pickup, dropoff, scheduledAt?` | `{ estimate }` : distance, durée, prix, majorations, tracé (OSRM). 60 / minute / IP |
| POST | `/otp` | 🌐 | `phone, purpose` (`register` · `guest` · `reset` · `phone`) | Envoie un code à 6 chiffres par SMS (`devCode` en développement). 3 / 15 min par numéro, 10 / h par IP |

## Authentification et compte

| Méthode | Adresse | Accès | Envoi | Effet |
|---|---|---|---|---|
| POST | `/auth/register` | 🌐 | `role, name, phone, pin, email?, code` (+ `plate, motoModel, licenseNumber, referralCode?`) | Inscription (code SMS vérifié). Un invité est transformé en vrai compte |
| POST | `/auth/login` | 🌐 | `phone, pin, space?` | Connexion. 5 échecs par numéro / 30 par IP en 15 min → bloqué. `space: "admin"` = Administration |
| POST | `/auth/reset-pin` | 🌐 | `phone, code, pin` | Nouveau code PIN (code SMS « reset ») ; ferme les sessions |
| POST | `/auth/logout` | 🌐 | — | Déconnexion |
| GET | `/me` | 👤 | — | `{ user, driver }` (droits pour un admin, contact d'urgence…) |
| POST | `/me/profile` | 👤 (pas invité) | `name, phone, email?, code?, emergencyContactName?, emergencyContactPhone?` (+ moto, permis) | Nouveau numéro → code SMS obligatoire |
| POST | `/me/pin` | 👤 (pas invité) | `currentPin, newPin` | Change le PIN |
| GET | `/me/places` | 🙋 | — | `{ saved, recent }` : lieux favoris et 5 dernières destinations |
| POST | `/me/places` | 🙋 | `kind (home/work/other), label, lat, lng` | Ajoute un favori (Maison/Travail remplacent l'ancien) |
| POST | `/me/places/:id/delete` | 🙋 | — | Supprime un favori |
| GET | `/me/notifications` | 👤 | — | `{ items, unread }` |
| POST | `/me/notifications/read` | 👤 | — | Tout marquer lu |
| GET | `/me/complaints` | 👤 | — | Mes réclamations et leurs réponses |
| POST | `/complaints` | 👤 | `rideId?, category, message` | Nouvelle réclamation (5 en cours au maximum) |
| POST | `/emergency` | 👤 | `rideId?, lat?, lng?` | 🆘 Alerte : équipe prévenue (push), SMS à la personne à prévenir. 3 / 10 min |

## Notifications push

| Méthode | Adresse | Accès | Effet |
|---|---|---|---|
| GET | `/push/key` | 🌐 | Clé publique VAPID |
| POST | `/push/subscribe` | 👤 | Enregistre l'abonnement du téléphone (`subscription`) |
| POST | `/push/unsubscribe` | 🌐 | Oublie un abonnement (`endpoint`) |

## Courses

| Méthode | Adresse | Accès | Envoi | Effet |
|---|---|---|---|---|
| GET | `/rides` | 👤 | — | Mes 200 dernières courses |
| POST | `/rides` | 🙋 | `pickup, dropoff, scheduledAt?, rider?: {name, phone}` | Commande (maintenant ou réservée, pour soi ou un proche) ; prix calculé par le serveur ; attribution lancée |
| POST | `/rides/guest` | 🌐 non connecté | `name, phone, code, pickup, dropoff, scheduledAt?, rider?` | Commande sans compte (code SMS « guest ») ; crée le passager invité et le connecte. 5 / h / IP |
| GET | `/rides/current` | 👤 | — | `{ ride, rideToRate }` |
| POST | `/rides/:id/action` | 🙋🏍️ | `action`: `accept` · `arrive` · `start` · `complete` · `cancel` | Étapes de la course (voir 03) |
| POST | `/rides/:id/decline` | 🏍️ | — | Refuse une course proposée (ou la masque si elle est ouverte à tous) |
| POST | `/rides/:id/rate` | 🙋 | `rating, comment?` | Note du chauffeur |
| POST | `/rides/:id/rate-passenger` | 🏍️ | `rating, comment?` | Note du passager |
| POST | `/rides/:id/share` | 🙋🏍️ | — | `{ token, url }` : lien de suivi `…/suivi/<token>` |
| GET | `/public/track/:token` | 🌐 | — | Suivi partagé (statut, chauffeur, position), valable jusqu'à 1 h après la fin |
| GET | `/public/track/:token/photo` | 🌐 | — | Photo du chauffeur pour la page de suivi |
| GET | `/drivers/:id/photo` | 👤 | — | Photo du chauffeur (admin, le chauffeur, ou passager d'une de ses courses des dernières 24 h) |

## Chauffeur

| Méthode | Adresse | Accès | Envoi | Effet |
|---|---|---|---|---|
| POST | `/driver/status` | 🏍️ | `online` | En ligne / hors ligne (validation, abonnement et documents vérifiés) |
| POST | `/driver/location` | 🏍️ | `lat, lng` | Position (événement `location` au passager) |
| GET | `/driver/available` | 🏍️ | — | Demandes proposées à moi ou ouvertes à tous, à ≤ 10 km |
| GET / POST | `/driver/subscription` | 🏍️ | `plan` (POST) | État / demande d'abonnement |
| POST | `/driver/subscription/cancel` | 🏍️ | — | Annule la demande en attente |
| GET | `/driver/documents` | 🏍️ | — | Mes documents |
| POST | `/driver/documents` | 🏍️ | `type, data (image), expiresAt?` | Envoie / remplace un document (8 Mo max par requête) |
| GET | `/driver/documents/:id/file` | 🏍️ | — | Voir mon document |
| GET | `/driver/stats` | 🏍️ | — | Gains, heures en ligne, taux d'acceptation, notes, parrainage |
| GET | `/driver/demand?hour=` | 🏍️ | — | Zones les plus demandées (30 jours, ± 1 h) |

## Administration

Chaque route vérifie le **droit** du rôle de l'administrateur (`permissions.ts`). Toutes les actions (`POST`) sont inscrites au **journal**.

| Domaine | Routes | Droit |
|---|---|---|
| Pastilles et vue d'ensemble | `GET /admin/counts`, `GET /admin/overview` | tous |
| Courses | `GET /admin/rides`, `POST /admin/rides/:id/cancel`, `POST /admin/rides/:id/delete` | `rides` |
| Chauffeurs | `GET /admin/drivers`, `POST /admin/drivers/:id` (`status`), `POST /admin/drivers/:id/delete`, `GET /admin/documents/:id/file` | `drivers` |
| Encaissement direct | `POST /admin/drivers/:id/subscription` | `subscriptions` |
| Passagers | `GET /admin/passengers`, `POST /admin/passengers/:id/block`, `POST /admin/passengers/:id/delete` | `passengers` |
| Abonnements | `GET /admin/subscriptions`, `POST /admin/subscriptions/:id` (`approve`), `POST /admin/subscriptions/:id/delete` | `subscriptions` |
| Avis | `GET /admin/reviews`, `POST /admin/reviews/:id` (`hidden`), `POST /admin/reviews/:id/delete` | `reviews` |
| Messages de contact | `GET /admin/messages`, `POST /admin/messages/:id` (`handled`), `POST /admin/messages/:id/delete` | `messages` |
| Réclamations | `GET /admin/complaints?status=`, `POST /admin/complaints/:id/resolve` (`note`), `POST /admin/complaints/:id/delete` | `complaints` |
| Urgences | `GET /admin/alerts?status=`, `POST /admin/alerts/:id/handle` (`note`) | `alerts` |
| Tarifs et réglages | `GET /admin/settings`, `POST /admin/settings` (`settings`) | `settings` |
| Lieux fréquents | `GET /admin/places`, `POST /admin/places`, `POST /admin/places/:id`, `POST /admin/places/:id/delete` | `places` |
| Messages groupés | `GET /admin/broadcasts`, `POST /admin/broadcasts` (`audience, title, message, sms`) | `broadcast` |
| Rapports | `GET /admin/reports?month=AAAA-MM`, `GET /admin/demand?hour=` | `reports` |
| Exports Excel (CSV) | `GET /admin/exports/:kind?month=` — `courses`, `abonnements`, `reclamations`, `chauffeurs`, `passagers` | `exports` |
| Journal | `GET /admin/audit?q=` | `audit` |
| Système | `GET /admin/system`, `POST /admin/system/backup` | `system` |
| Administrateurs | `GET /admin/admins` (tous) ; 👑 `POST /admin/admins`, `/admin/admins/:id/block`, `/delete`, `/transfer`, `/role` | principal |

## Public et technique

| Méthode | Adresse | Accès | Effet |
|---|---|---|---|
| GET | `/public/reviews` | 🌐 | Avis publics de la page d'accueil |
| POST | `/public/contact` | 🌐 | Formulaire de contact (3 / 10 min / IP) |
| GET | `/events` | 👤 | Flux temps réel (SSE). Canaux : `user:<id>`, `drivers` (chauffeurs), `admins` (équipe) |
| GET | `/health` | 🌐 | `{ ok, uptimeSeconds }`, ou 503 si la base ne répond pas (surveillance) |

## Tester une route à la main

- `http://localhost:4000/api/health` → `{"ok":true,…}`
- `http://localhost:3000/api/public/config` → tarifs et lieux
- `http://localhost:3001/api/admin/counts` → 401 sans session admin
- Tous les parcours sont aussi rejoués automatiquement par `npm test` (voir [03-backend.md](03-backend.md)).
