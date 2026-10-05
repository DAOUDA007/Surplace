# 9. Où modifier quoi, glossaire et points d'attention

## « Je veux changer… » → quel fichier ?

| Je veux changer… | Fichier(s) | Attention |
|---|---|---|
| Le prix au km, le minimum, l'arrondi | `Backend/src/pricing.ts` **et** `Frontend/src/lib/pricing.ts` (`PRICING`) | Les deux copies doivent rester **identiques**, sinon le prix affiché ≠ prix facturé |
| Le prix ou la durée des abonnements | `pricing.ts` ×2 (`SUBSCRIPTION_PLANS`) | Idem. Les textes de l'accueil et de l'e-mail se mettent à jour seuls |
| Le délai d'annulation automatique (5 min) | `Backend/src/rides.ts` (`REQUEST_TIMEOUT_MIN`) | |
| Le rayon de visibilité des demandes (10 km) | `Backend/src/rides.ts` (`DISPATCH_RADIUS_KM`) | |
| Les distances min/max d'une course (0,2 / 40 km) | `Backend/src/rides.ts` (`createRide`) | |
| La durée d'une session (30 jours) | `Backend/src/auth.ts` (`SESSION_DAYS`) | |
| Les coordonnées de contact de l'accueil | `Frontend/src/lib/site.ts` (`CONTACT`) | |
| Les coordonnées dans les e-mails | `Backend/src/site.ts` (`CONTACT`) | Actuellement **différentes** de celles du Frontend (voir plus bas) |
| Les sujets du formulaire de contact | `Frontend/src/lib/site.ts` (`CONTACT_SUBJECTS`) | |
| La limite anti-spam (3 / 10 min) | `Backend/src/public.ts` (`createContactMessage`) | |
| Les lieux fréquents de Korhogo | `Frontend/src/lib/places.ts` (`POPULAR_PLACES`) | Coordonnées à vérifier sur le terrain |
| La zone de recherche d'adresse | `Frontend/src/lib/places.ts` (`viewbox` dans `searchAddress`) | Format : `ouest,nord,est,sud` |
| Le centre de la carte | `Frontend/src/lib/places.ts` (`CITY_CENTER`) | |
| Les couleurs (orange de la marque, thème sombre) | `Frontend/src/app/globals.css` (`@theme`, `:root`, `.dark`) | Et `themeColor` dans `app/layout.tsx` |
| La police | `Frontend/src/app/layout.tsx` | |
| Le titre de l'onglet / la description Google | `metadata` dans `app/layout.tsx` et chaque `page.tsx` | |
| Les textes de la page d'accueil | `Frontend/src/app/page.tsx` | |
| Le texte de l'e-mail de bienvenue | `Backend/src/emails/welcome.ts` | |
| Les libellés des statuts de course | `Frontend/src/lib/format.ts` (`STATUS_LABELS`) | |
| Ajouter un écran admin | Nouveau dossier `Frontend/src/app/admin/<nom>/page.tsx` + composant dans `components/admin/` + ligne dans `NAV` (`AdminShell.tsx`) + route(s) dans `Backend/src/server.ts` | |
| Ajouter une route API | `Backend/src/server.ts` (route) + fonction dans le fichier métier adapté | Toujours commencer par `requireUser(req, "<rôle>")` |
| Ajouter une colonne en base | `Backend/src/db.ts` : `SCHEMA` **et** `migrate()` | Sinon les bases existantes ne l'auront pas |
| Ajouter un champ partagé (ex. dans `Ride`) | `types.ts` ×2, `toRide()` dans `rides.ts`, la requête SQL | |
| La vitesse du mode démo | `Frontend/src/components/DriverApp.tsx` (`DEMO_STEP_M`) | |

## Glossaire

| Terme | Explication |
|---|---|
| **API** | Ensemble d'adresses (`/api/...`) que le Frontend appelle pour lire ou modifier des données. Répond en JSON. |
| **Backend / Frontend** | Le serveur qui détient les données et les règles / la partie qui affiche l'interface. |
| **Proxy / rewrite** | Next.js reçoit `/api/...` et le transmet au Backend, de façon invisible pour le navigateur. |
| **Route** | Une adresse + une méthode (`GET /api/me`) associée à un code qui y répond. |
| **GET / POST** | Méthodes HTTP : lire / envoyer ou modifier. |
| **JSON** | Format texte pour échanger des données : `{ "name": "Awa", "rating": 5 }`. |
| **Cookie** | Petite donnée que le navigateur stocke et renvoie automatiquement à chaque requête vers le même site. |
| **Session / jeton** | Preuve de connexion : un code aléatoire dans le cookie, retrouvé dans la table `sessions`. |
| **Hachage (hash), sel** | Transformation à sens unique d'un PIN ; le sel rend chaque résultat unique. |
| **Transaction** | Groupe d'opérations en base exécutées « tout ou rien ». |
| **Injection SQL** | Attaque consistant à glisser du SQL dans un champ ; évitée par les paramètres `?`. |
| **Migration** | Modification de la structure d'une base existante (ajout de colonne…). |
| **Seed** | Données insérées automatiquement dans une base neuve (comptes de démo). |
| **SSE (Server-Sent Events)** | Connexion HTTP qui reste ouverte pour que le serveur envoie des messages au navigateur en temps réel. |
| **Bus d'événements** | « Tableau d'affichage » interne où un module publie et d'autres écoutent (`events.ts`). |
| **Polling** | Interroger régulièrement le serveur (ici toutes les 10–15 s) ; filet de sécurité du temps réel. |
| **Composant serveur / client** | Code React exécuté sur le serveur Next.js / dans le navigateur (`"use client"`). |
| **Hydratation** | Moment où React « prend le contrôle » du HTML envoyé par le serveur pour le rendre interactif. |
| **Hook** | Fonction React `useXxx` qui ajoute un comportement (état, effet, abonnement) à un composant. |
| **Props** | Paramètres passés à un composant. |
| **Layout** | Cadre commun à plusieurs pages (Next.js). |
| **Géocodage / géocodage inverse** | Adresse → coordonnées / coordonnées → adresse (Nominatim). |
| **Haversine** | Formule de distance entre deux points GPS sur une sphère. |
| **Debounce** | Attendre que l'utilisateur arrête de taper avant d'agir (500 ms dans `PlaceSearch`). |
| **Tuiles** | Les petites images carrées qui composent une carte. |
| **Contexte sécurisé** | Page en https ou sur `localhost` ; obligatoire pour le GPS du navigateur. |
| **Anonymisation** | Effacer les informations personnelles d'un compte tout en gardant ses courses. |
| **Dénormalisation** | Stocker une valeur calculée (somme des notes) pour aller plus vite. |
| **WAL** | Mode de SQLite qui permet de lire pendant qu'on écrit. |
| **Monorepo** | Un seul dépôt git contenant plusieurs projets (Backend, Frontend). |

## Points d'attention repérés dans le code

Ces remarques ne bloquent pas l'application aujourd'hui, mais méritent d'être connues.

### Incohérences à corriger

1. **Les deux `site.ts` ne sont pas identiques.** Le commentaire de `Backend/src/site.ts` demande de les garder synchronisés, mais :

   | | `Frontend/src/lib/site.ts` (accueil) | `Backend/src/site.ts` (e-mails) |
   |---|---|---|
   | Téléphone | +225 05 74 32 88 18 | +225 07 00 00 00 00 |
   | E-mail | academypro61@gmail.com | contact@surplace.ci |
   | Adresse | Cité Ali Kader, Korhogo | Quartier Résidentiel, Korhogo |
   | Horaires | 8 h à 20 h | 6 h à 22 h |

   Les e-mails de bienvenue affichent donc des coordonnées provisoires. Il faut recopier les bonnes valeurs dans `Backend/src/site.ts`.

2. **Compte admin de démonstration** : le README annonce `05 74 32 88 18` / PIN `2002`, alors que `seed()` crée `07 00 00 00 00` / `1234` sur une base neuve. Votre base actuelle a probablement été modifiée via « Mon compte ». Après une réinitialisation de la base, c'est le compte `07…` qui reviendra.

3. **Caractères abîmés** dans `Frontend/package.json` : la description contient `SURPLACE â€”` au lieu de `SURPLACE —` (fichier enregistré une fois avec un mauvais encodage). Sans effet sur l'application.

4. **Dépendance `"surplace": "file:.."`** dans `Backend/package.json` et `Frontend/package.json` : elle fait du dossier racine une dépendance de chaque sous-projet. Elle n'est utilisée par aucun `import` et semble provenir d'un `npm install` lancé avec un mauvais dossier. À vérifier, puis probablement à retirer.

### Sécurité, avant une mise en production

5. **Pas de limite de tentatives de connexion.** Un PIN de 4 chiffres n'a que 10 000 possibilités : un robot peut les essayer toutes. Le README le prévoit (« limitation des tentatives », code SMS). À faire en priorité avant d'ouvrir au public.
6. **Changer le compte admin de démonstration** (numéro et PIN). L'écran « Mon compte » affiche un avertissement tant que `07 00 00 00 00` est utilisé.
7. Les comptes de démo passager et chauffeur sont créés aussi en production si la base est neuve : pensez à les supprimer depuis l'admin.

### Limites d'architecture (normales pour la taille actuelle)

8. **Un seul processus Backend** : le bus temps réel (`events.ts`) et l'anti-spam (`public.ts`) sont en mémoire, et SQLite n'accepte qu'un écrivain. Pour plusieurs serveurs : Redis + PostgreSQL (prévu dans le README).
9. **Distances à vol d'oiseau ×1,3**, pas de vrai itinéraire routier. La ligne sur la carte est droite.
10. **Nominatim** (recherche d'adresse) est un service gratuit avec une politique d'usage limitée (1 requête/seconde, pas d'usage intensif). En cas de forte affluence, il faudra un service payant ou auto-hébergé.
11. **Fichiers en double** (`types.ts`, `pricing.ts`, `site.ts`) : à garder synchronisés à la main.

## Pour aller plus loin

- Lire le code dans l'ordre d'un parcours de [08-parcours-complets.md](08-parcours-complets.md), en ouvrant chaque fichier cité.
- Ouvrir les outils de développement du navigateur (F12) → onglet **Réseau** : vous verrez passer chaque appel `/api/...` et le flux `events` (onglet « EventStream »).
- Ouvrir `Backend/data/surplace.db` dans un explorateur SQLite pendant une course de test : vous verrez la ligne `rides` changer de statut à chaque étape.
- Vérifier les types : `npm run typecheck` dans `Backend/`, `npx tsc --noEmit` dans `Frontend/`.
