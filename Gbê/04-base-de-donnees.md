# 4. La base de données (SQLite)

Fichier : `Backend/data/surplace.db` (ou la valeur de `SURPLACE_DB`). Tout est défini dans `Backend/src/db.ts`.

## Pourquoi SQLite ?

- **Aucune installation** : pas de serveur de base de données à lancer, juste un fichier.
- **Sauvegarde simple** : copier le fichier (serveur arrêté) suffit.
- **Rapide** pour une ville comme Korhogo : des milliers de courses par jour ne posent aucun problème.
- **Limite** : un seul serveur peut écrire dans le fichier. Pour grandir (plusieurs serveurs), le README prévoit de passer à PostgreSQL.

Pour **explorer** la base, installez par exemple « DB Browser for SQLite » ou l'extension VS Code « SQLite Viewer », et ouvrez `surplace.db`.

## Les réglages à l'ouverture (`open()`)

| Ligne | Effet |
|---|---|
| `fs.mkdirSync(..., { recursive: true })` | Crée `data/` s'il n'existe pas |
| `journal_mode = WAL` | Mode « Write-Ahead Log » : les lectures ne sont pas bloquées pendant une écriture. Crée les fichiers `surplace.db-wal` et `surplace.db-shm` à côté (normaux, ne pas les supprimer serveur allumé). |
| `foreign_keys = ON` | Active la vérification des liens entre tables (désactivée par défaut dans SQLite) |
| `db.exec(SCHEMA)` | Crée les tables **si elles n'existent pas** (`CREATE TABLE IF NOT EXISTS`) |
| `migrate(db)` | Met à jour une ancienne base |
| `seed(db)` | Ajoute les comptes de démonstration dans une base vide |

## Schéma des relations

```
                     ┌──────────────┐
                     │    users     │  (passagers, chauffeurs, admins)
                     └──────┬───────┘
        ┌───────────────┬───┴──────────┬─────────────────────┐
        │ 1—1           │ 1—N          │ 1—N                 │ 1—N
        ▼               ▼              ▼                     ▼
 ┌────────────┐  ┌────────────┐  ┌───────────────────┐  ┌───────────────┐
 │  drivers   │  │  sessions  │  │      rides        │  │ subscriptions │
 │ (infos     │  │ (connexions│  │ passenger_id → users  │ driver_id →   │
 │  moto,     │  │  actives)  │  │ driver_id    → users  │   users       │
 │  position) │  └────────────┘  └───────────────────┘  └───────────────┘
 └────────────┘

 ┌───────────────────┐
 │ contact_messages  │  (indépendante : messages du formulaire public)
 └───────────────────┘
```

## Les tables

### `users` — tous les comptes

| Colonne | Type | Rôle |
|---|---|---|
| `id` | entier auto | Identifiant |
| `role` | texte | `passenger`, `driver` ou `admin` (contrôlé par `CHECK`) |
| `name` | texte | Nom complet |
| `phone` | texte **unique** | Numéro normalisé à 10 chiffres. Sert d'identifiant de connexion. |
| `email` | texte, facultatif | Pour l'e-mail de bienvenue |
| `pin_hash` | texte | `sel:empreinte` du PIN (jamais le PIN en clair) |
| `created_at` | texte | Date ISO d'inscription |
| `blocked` | 0/1 | Compte bloqué (connexion impossible) |
| `is_principal` | 0/1 | Administrateur principal (un seul) |
| `deleted_at` | texte, facultatif | Rempli si le compte a été anonymisé |
| `guest` | 0/1 | Passager **invité** : a commandé sans créer de compte |
| `guest_phone` | texte, facultatif | Vrai numéro d'un invité. Pour un invité, `phone` contient une valeur fictive unique (`invite-…`) : le numéro ne bloque pas une future inscription et ne permet pas de retrouver ses courses. Le code lit toujours `COALESCE(guest_phone, phone)`. |

**Pourquoi une seule table pour les trois rôles ?** Connexion, session, profil et PIN fonctionnent pareil pour tous. Les informations propres aux chauffeurs sont dans une table à part.

### `drivers` — informations spécifiques aux chauffeurs

| Colonne | Rôle |
|---|---|
| `user_id` | Clé primaire **et** lien vers `users.id` (relation 1 à 1). `ON DELETE CASCADE` : supprimer l'utilisateur supprime sa ligne chauffeur. |
| `plate`, `moto_model` | Immatriculation et modèle de moto |
| `license_number` | Numéro du permis de conduire (vide pour les chauffeurs inscrits avant ce champ) |
| `status` | `pending` (à valider), `approved` (validé), `suspended` (suspendu) |
| `is_online` | 0/1 : disponible pour recevoir des courses |
| `lat`, `lng`, `location_at` | Dernière position GPS connue et sa date |
| `rating_sum`, `rating_count` | Somme et nombre des notes reçues. La moyenne = somme / nombre. |
| `subscription_until` | Date de fin de l'abonnement (vide = jamais abonné) |

**Pourquoi stocker `rating_sum` et `rating_count` plutôt que recalculer ?** Afficher la note d'un chauffeur est très fréquent ; additionner deux nombres stockés est instantané, alors que recalculer la moyenne sur toutes ses courses le serait de moins en moins. On parle de **dénormalisation**. Contrepartie : il faut penser à les mettre à jour (`rateRide`, `removeRatingFromDriver`).

### `sessions` — connexions actives

| Colonne | Rôle |
|---|---|
| `token` | Le jeton aléatoire contenu dans le cookie |
| `user_id` | À qui appartient la session (`ON DELETE CASCADE`) |
| `expires_at` | Date d'expiration (30 jours) |

Un même utilisateur peut avoir plusieurs sessions (téléphone + ordinateur).

### `rides` — les courses

| Colonne | Rôle |
|---|---|
| `id` | Numéro de course (affiché « #12 » dans l'admin) |
| `passenger_id` | Le passager |
| `driver_id` | Le chauffeur (vide tant que personne n'a accepté) |
| `status` | `requested`, `accepted`, `arrived`, `in_progress`, `completed`, `cancelled` |
| `pickup_label`, `pickup_lat`, `pickup_lng` | Départ : nom + coordonnées |
| `dropoff_label`, `dropoff_lat`, `dropoff_lng` | Arrivée : nom + coordonnées |
| `distance_km`, `price` | Calculés **au moment de la commande** et figés (si le tarif change demain, les anciennes courses gardent leur prix) |
| `payment_method` | Toujours `cash` aujourd'hui |
| `requested_at`, `accepted_at`, `arrived_at`, `started_at`, `completed_at`, `cancelled_at` | Horodatage de chaque étape (la « chronologie » visible dans l'admin) |
| `cancelled_by` | `passenger`, `admin` ou `timeout` |
| `rating`, `comment` | Note (1–5) et commentaire du passager |
| `review_hidden` | 0/1 : avis masqué par l'admin (ajouté par migration) |

**Index** : `rides_status_idx`, `rides_passenger_idx`, `rides_driver_idx`. Un index est comme le sommaire d'un livre : il accélère les recherches « courses en attente », « courses de tel passager », « courses de tel chauffeur », qui sont les plus fréquentes.

### `subscriptions` — historique des abonnements

| Colonne | Rôle |
|---|---|
| `driver_id` | Le chauffeur |
| `plan` | `monthly` ou `yearly` |
| `amount` | Montant en FCFA (copié au moment de la demande) |
| `status` | `pending`, `paid`, `rejected`, `cancelled` |
| `requested_at`, `paid_at` | Dates de demande et de paiement |
| `starts_at`, `ends_at` | Période couverte par ce paiement |

### `contact_messages` — formulaire de contact

`name`, `phone` (téléphone **ou** e-mail), `subject`, `message`, `created_at`, `handled` (0/1 : traité par l'admin).

## Les dates

Toutes les dates sont stockées en **texte ISO 8601 UTC**, par exemple `2026-10-05T14:32:10.123Z`. Avantages :
- lisibles dans un explorateur de base ;
- **triables et comparables comme du texte** : `requested_at < '2026-10-05'` fonctionne ;
- `substr(completed_at, 1, 10)` donne directement le jour (`2026-10-05`), utilisé pour le graphique des 7 jours.

## Les migrations (`migrate()`)

Quand le code évolue et qu'une colonne est ajoutée, `CREATE TABLE IF NOT EXISTS` ne modifie **pas** une table déjà existante. `migrate()` comble ce manque :

1. Lit les colonnes existantes avec `PRAGMA table_info(...)`.
2. Ajoute celles qui manquent avec `ALTER TABLE ... ADD COLUMN` : `rides.review_hidden`, `users.blocked`, `users.email`, `users.is_principal`, `users.deleted_at`, `users.guest`, `users.guest_phone`, `drivers.license_number`, `drivers.subscription_until`.
3. S'assure qu'il existe **toujours un administrateur principal** (à défaut, le plus ancien admin actif le devient).
4. Lors de l'ajout de `subscription_until`, offre un an au chauffeur de démonstration.
5. Corrige une ancienne version qui plaçait les chauffeurs à **Abidjan** (latitude < 7) : ils sont replacés au centre de Korhogo.

**Pour ajouter une colonne à l'avenir** : ajoutez-la dans `SCHEMA` (pour les bases neuves) **et** un bloc `if (!columns.includes("nouvelle_colonne")) ALTER TABLE ...` dans `migrate()` (pour les bases existantes).

## Les données de démonstration (`seed()`)

Exécuté seulement si **aucun admin n'existe** (donc une seule fois, sur une base neuve). Crée, avec le PIN `1234` :

| Rôle | Nom | Téléphone |
|---|---|---|
| Admin (principal) | Administrateur | 07 00 00 00 00 |
| Passager | Awa Koné | 07 00 00 00 01 |
| Chauffeur (validé, 1 an d'abonnement, au centre de Korhogo) | Moussa Traoré | 07 00 00 00 02 — moto Haojue 125, plaque AB 1234 CI |

> Le README indique un admin `05 74 32 88 18` / PIN `2002` : c'est sans doute le compte admin de démonstration modifié ensuite via « Mon compte ». Sur une **base neuve**, c'est bien `07 00 00 00 00` / `1234` qui est créé.

**PIN administrateur oublié** : `npm run reset-admin-pin -- 4821` dans `Backend/` (voir [03-backend.md](03-backend.md)).

**Repartir de zéro** : arrêtez les serveurs, supprimez `Backend/data/surplace.db` (et `-wal`, `-shm`), relancez `npm run dev`. ⚠️ Toutes les données sont perdues.

## Comment le code parle à la base

`better-sqlite3` utilise des **requêtes préparées** :

```ts
db.prepare("SELECT id FROM users WHERE phone = ?").get(phone)   // une ligne ou undefined
db.prepare("SELECT ... WHERE ...").all(...params)               // tableau de lignes
db.prepare("UPDATE ... WHERE id = ?").run(id)                   // { changes, lastInsertRowid }
db.transaction(() => { ... })()                                  // tout ou rien
```

Les `?` sont remplacés par les valeurs de façon sûre : même si quelqu'un tape `'; DROP TABLE users; --` dans un champ, c'est traité comme du texte. C'est la protection contre **l'injection SQL**.

Les seuls endroits où du texte est collé directement dans le SQL (`${where}`, `${column}`, `ACTIVE_SQL`) utilisent des valeurs **écrites dans le code**, jamais des saisies d'utilisateur.

---

## Tables et colonnes ajoutées avec les nouvelles fonctionnalités

Elles sont créées par `migrateFeatures()` (dans `db.ts`) au démarrage, sur une base neuve comme sur une base existante : rien à faire à la main. La fonction `addColumn(table, colonne, définition)` n'ajoute une colonne que si elle manque.

### Colonnes ajoutées

| Table | Colonnes | Rôle |
|---|---|---|
| `users` | `rating_sum`, `rating_count` | Note des **passagers** donnée par les chauffeurs |
| `users` | `emergency_contact_name`, `emergency_contact_phone` | Personne à prévenir (bouton 🆘) |
| `users` | `admin_role` | Rôle d'un administrateur : `full`, `operations`, `finance`, `moderation` |
| `users` | `referral_code` (unique) | Code de parrainage d'un chauffeur |
| `drivers` | `referred_by`, `referral_rewarded` | Parrain du chauffeur ; récompense déjà donnée ? |
| `drivers` | `reminder3_for`, `reminder1_for` | Date d'expiration déjà rappelée à J-3 / J-1 (pas de rappel en double) |
| `rides` | `scheduled_at` | Réservation à l'avance |
| `rides` | `rider_name`, `rider_phone` | Course commandée pour un proche |
| `rides` | `share_token` (unique) | Lien secret de suivi partagé |
| `rides` | `passenger_rating`, `passenger_comment` | Note du passager par le chauffeur |
| `rides` | `offer_driver_id`, `offer_expires_at`, `dispatch_open` | Attribution : chauffeur sollicité et jusqu'à quand ; 1 = ouverte à tous |
| `rides` | `route_source` | `osrm` (distance par la route) ou `estimate` (ligne droite) |

### Nouvelles tables

| Table | Contenu |
|---|---|
| `audit_log` | Journal des actions des administrateurs (qui, quoi, sur quoi, détails, IP, date) |
| `otp_codes` | Codes SMS (hachés), but, essais, expiration, utilisation |
| `settings` | Réglages de l'application (une ligne `app`, en JSON) |
| `driver_documents` | Un document par type et par chauffeur : fichier, type d'image, date d'expiration, date d'envoi, dernier rappel |
| `saved_places` | Lieux favoris des passagers (Maison, Travail, autres) |
| `emergency_alerts` | Alertes 🆘 : qui, course, position, date, traitée par / quand / note |
| `complaints` | Réclamations : course, catégorie, message, statut, réponse de l'équipe |
| `ride_offers` | Propositions de course aux chauffeurs et leur réponse (`pending`, `accepted`, `declined`, `expired`, `cancelled`) |
| `notifications` | Notifications de la cloche 🔔 (lue ou non) |
| `push_subscriptions` | Téléphones abonnés aux notifications push |
| `driver_online_log` | Périodes en ligne des chauffeurs (début, fin) pour les statistiques |
| `places` | Lieux fréquents de Korhogo, gérés dans l'administration |
| `broadcasts` | Historique des messages groupés |

### Fichiers à côté de la base

| Dossier / fichier | Contenu | Git |
|---|---|---|
| `data/backups/` | Sauvegardes quotidiennes (30 jours) | ignoré |
| `data/uploads/documents/` | Photos des documents des chauffeurs | ignoré |
| `data/sms/` | SMS non envoyés (sans fournisseur) | ignoré |
| `data/vapid.json` | Clés des notifications push (à ne pas perdre) | ignoré |

⚠️ Sauvegardez aussi `data/uploads/` et `data/vapid.json` lors d'un changement de serveur : la base seule ne contient pas les photos.
