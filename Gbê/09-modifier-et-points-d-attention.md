# 9. Où modifier quoi, glossaire et points d'attention

## « Je veux changer… » → quel fichier ?

| Je veux changer… | Fichier(s) | Attention |
|---|---|---|
| Le prix au km, le minimum, l'arrondi | `pricing.ts` dans **Backend/src**, **Application/src/lib** et **Administration/src/lib** (`PRICING`) | Les trois copies doivent rester **identiques**, sinon le prix affiché ≠ prix facturé |
| Le prix ou la durée des abonnements | `pricing.ts` ×3 (`SUBSCRIPTION_PLANS`) | Idem |
| Le délai d'annulation automatique (5 min) | `Backend/src/rides.ts` (`REQUEST_TIMEOUT_MIN`) | |
| Le rayon de visibilité des demandes (10 km) | `Backend/src/rides.ts` (`DISPATCH_RADIUS_KM`) | |
| Les distances min/max d'une course (0,2 / 40 km) | `Backend/src/rides.ts` (`createRide`) | |
| La limite de commandes sans compte (5 / heure / IP) | `Backend/src/server.ts` (route `/rides/guest`) | |
| La durée d'une session (30 jours) | `Backend/src/auth.ts` (`SESSION_DAYS`) | |
| Les règles du numéro de permis | `Backend/src/validation.ts` (`validateLicense`) | Et `minLength`/`maxLength` dans `AuthForms.tsx` et `ProfileForm.tsx` |
| Les coordonnées de contact de l'accueil | `Application/src/lib/site.ts` (`CONTACT`) | |
| Les coordonnées dans les e-mails | `Backend/src/site.ts` (`CONTACT`) | Actuellement **différentes** de celles de l'Application (voir plus bas) |
| Les sujets du formulaire de contact | `Application/src/lib/site.ts` (`CONTACT_SUBJECTS`) | |
| La limite anti-spam du contact (3 / 10 min) | `Backend/src/public.ts` (`createContactMessage`) | |
| Les lieux fréquents de Korhogo | `Application/src/lib/places.ts` (`POPULAR_PLACES`) | Coordonnées à vérifier sur le terrain |
| Le centre de la carte | `lib/places.ts` des deux sites (`CITY_CENTER`) | |
| Les étapes « Comment ça marche » | `Application/src/app/page.tsx` (`STEPS`) | La vitesse du défilement : `animation: marquee 30s` dans `globals.css` |
| Les couleurs (orange de la marque, thème sombre) | `src/app/globals.css` des **deux sites** | Et `themeColor` dans `app/layout.tsx` |
| Le titre de l'onglet / la description Google | `metadata` dans `app/layout.tsx` et chaque `page.tsx` | |
| Les textes de la page d'accueil | `Application/src/app/page.tsx` | |
| Le texte de l'e-mail de bienvenue | `Backend/src/emails/welcome.ts` | |
| Les libellés des statuts de course | `lib/format.ts` des deux sites (`STATUS_LABELS`) | |
| Ajouter un écran admin | Dossier `Administration/src/app/(espace)/<nom>/page.tsx` + composant dans `Administration/src/components/admin/` + ligne dans `NAV` (`AdminShell.tsx`) + route(s) dans `Backend/src/server.ts` | |
| Ajouter une route API | `Backend/src/server.ts` + fonction dans le fichier métier adapté | Toujours commencer par `requireUser(req, "<rôle>")` |
| Ajouter une colonne en base | `Backend/src/db.ts` : `SCHEMA` **et** `migrate()` | Sinon les bases existantes ne l'auront pas |
| Ajouter un champ partagé (ex. dans `Ride`) | `types.ts` ×3, `toRide()` dans `rides.ts`, la requête SQL | |
| L'adresse du site d'administration | Variable `ADMIN_URL` (Application) | Par défaut `http://localhost:3001` |
| Le PIN de l'administrateur principal (oublié) | `npm run reset-admin-pin -- 4821` dans `Backend/` | |

## Fichiers copiés entre les projets

Ces fichiers existent en plusieurs exemplaires. Une correction dans l'un doit être reportée dans les autres.

| Fichier | Backend | Application | Administration |
|---|---|---|---|
| `types.ts` | `src/` | `src/lib/` | `src/lib/` |
| `pricing.ts` | `src/` | `src/lib/` | `src/lib/` |
| `site.ts` | `src/` | `src/lib/` | — |
| `api.ts`, `format.ts`, `places.ts`, `theme.ts` | — | `src/lib/` | `src/lib/` |
| `MapView.tsx`, `LeafletMap.tsx`, `Logo.tsx`, `ThemeToggle.tsx`, `ProfileForm.tsx`, `ui.tsx` | — | `src/components/` | `src/components/` |
| `globals.css`, `layout.tsx` | — | `src/app/` | `src/app/` (titre différent) |

## Glossaire

| Terme | Explication |
|---|---|
| **API** | Ensemble d'adresses (`/api/...`) que les sites appellent pour lire ou modifier des données. Répond en JSON. |
| **Backend** | Le serveur qui détient les données et les règles (dossier `Backend`). |
| **Application / Administration** | Les deux sites Next.js : celui des clients (3000) et celui de l'équipe (3001). |
| **Proxy / rewrite** | Un site reçoit `/api/...` et le transmet au Backend, de façon invisible pour le navigateur. |
| **Route** | Une adresse + une méthode (`GET /api/me`) associée à un code qui y répond. |
| **GET / POST** | Méthodes HTTP : lire / envoyer ou modifier. |
| **JSON** | Format texte pour échanger des données : `{ "name": "Awa", "rating": 5 }`. |
| **Cookie** | Petite donnée que le navigateur stocke et renvoie automatiquement au même site. |
| **Session / jeton** | Preuve de connexion : un code aléatoire dans le cookie, retrouvé dans la table `sessions`. |
| **Passager invité** | Personne qui a commandé sans créer de compte ; reconnue sur son téléphone par le cookie. |
| **Hachage (hash), sel** | Transformation à sens unique d'un PIN ; le sel rend chaque résultat unique. |
| **Transaction** | Groupe d'opérations en base exécutées « tout ou rien ». |
| **Injection SQL** | Attaque consistant à glisser du SQL dans un champ ; évitée par les paramètres `?`. |
| **Migration** | Modification de la structure d'une base existante (ajout de colonne…). |
| **Seed** | Données insérées automatiquement dans une base neuve (comptes de démo). |
| **SSE (Server-Sent Events)** | Connexion HTTP qui reste ouverte pour que le serveur envoie des messages en temps réel. |
| **Bus d'événements** | « Tableau d'affichage » interne où un module publie et d'autres écoutent (`events.ts`). |
| **Polling** | Interroger régulièrement le serveur (toutes les 10–15 s) ; filet de sécurité du temps réel. |
| **Composant serveur / client** | Code React exécuté sur le serveur Next.js / dans le navigateur (`"use client"`). |
| **Hydratation** | Moment où React rend interactif le HTML envoyé par le serveur. |
| **Hook** | Fonction React `useXxx` qui ajoute un comportement à un composant. |
| **Layout** | Cadre commun à plusieurs pages (Next.js). |
| **Groupe de routes** | Dossier entre parenthèses, ex. `(espace)` : partage un layout sans apparaître dans l'adresse. |
| **Géocodage / inverse** | Adresse → coordonnées / coordonnées → adresse (Nominatim). |
| **Haversine** | Formule de distance entre deux points GPS. |
| **Debounce** | Attendre que l'utilisateur arrête de taper avant d'agir. |
| **Marquee** | Bande qui défile en boucle (« Comment ça marche »). |
| **Contexte sécurisé** | Page en https ou sur `localhost` ; obligatoire pour le GPS du navigateur. |
| **Anonymisation** | Effacer les informations personnelles d'un compte tout en gardant ses courses. |
| **Monorepo** | Un seul dépôt git contenant plusieurs projets. |

## Points d'attention repérés dans le code

### Incohérences à corriger

1. **Les `site.ts` du Backend et de l'Application ne sont pas identiques.**

   | | `Application/src/lib/site.ts` (accueil) | `Backend/src/site.ts` (e-mails) |
   |---|---|---|
   | Téléphone | +225 05 74 32 88 18 | +225 07 00 00 00 00 |
   | E-mail | academypro61@gmail.com | contact@surplace.ci |
   | Adresse | Cité Ali Kader, Korhogo | Quartier Résidentiel, Korhogo |
   | Horaires | 8 h à 20 h | 6 h à 22 h |

   Les e-mails de bienvenue affichent donc des coordonnées provisoires.

2. **Compte admin de démonstration** : le README annonce `05 74 32 88 18` / `2002`, alors qu'une base neuve crée `07 00 00 00 00` / `1234`.

3. **Dépendance `"surplace": "file:.."`** dans `Backend/package.json` et `Application/package.json` : inutilisée (aucun `import`). Elle n'a pas été reprise dans l'Administration. À retirer après vérification.

### Sécurité, avant une mise en production

4. **Pas de limite de tentatives de connexion.** Un PIN de 4 chiffres n'a que 10 000 possibilités. Priorité avant d'ouvrir au public (voir les propositions, [10-propositions.md](10-propositions.md)).
5. **Changer le compte admin de démonstration** (numéro et PIN).
6. Les comptes de démo passager et chauffeur sont créés aussi en production si la base est neuve : les supprimer depuis l'admin.
7. **Commandes sans compte** : la limite de 5 par heure et par IP freine les fausses commandes, mais un numéro de téléphone n'est pas vérifié. Une vérification par SMS est recommandée à terme.
8. **Héberger l'Administration** sur une adresse distincte (ex. `admin.surplace.ci`) et, si possible, en limiter l'accès (mot de passe du serveur web, liste d'adresses IP).

### Limites d'architecture (normales pour la taille actuelle)

9. **Un seul processus Backend** : bus temps réel, anti-spam et limite des commandes invitées sont en mémoire, et SQLite n'accepte qu'un écrivain. Pour plusieurs serveurs : Redis + PostgreSQL.
10. **Distances à vol d'oiseau ×1,3**, pas de vrai itinéraire routier.
11. **Nominatim** est un service gratuit à usage limité (1 requête/seconde).
12. **Fichiers copiés** entre les trois projets (tableau plus haut) : à synchroniser à la main.

### Sous Windows, en développement

13. Le démarrage de Next.js peut être lent et produire des erreurs `EPERM … rename … .next` (deux compilations simultanées, ou l'antivirus qui scanne `.next`). Ce n'est pas un bug du code : arrêtez les serveurs, supprimez le dossier `.next` du site concerné et relancez. Exclure le dossier du projet de l'analyse en temps réel de Windows Defender accélère nettement la compilation.

## Pour aller plus loin

- Suivre un parcours de [08-parcours-complets.md](08-parcours-complets.md) en ouvrant chaque fichier cité.
- Outils de développement du navigateur (F12) → **Réseau** : chaque appel `/api/...` et le flux `events`.
- Ouvrir `Backend/data/surplace.db` dans un explorateur SQLite pendant une course de test.
- Vérifier les types : `npm run typecheck` dans `Backend/`, `npx tsc --noEmit` dans `Application/` et `Administration/`.
