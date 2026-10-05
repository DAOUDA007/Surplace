# SURPLACE 🏍️

Application web de taxi-moto pour Korhogo : les passagers commandent une moto, voient le prix avant de commander et suivent leur chauffeur en temps réel. Le paiement se fait en espèces.

## Structure

```
Surplace/
├── Backend/    API Node.js (Express + SQLite) — port 4000
│   ├── src/server.ts      routes de l'API et flux temps réel (SSE)
│   ├── src/rides.ts       cycle de vie des courses
│   ├── src/drivers.ts     chauffeurs : en ligne, position, validation
│   ├── src/auth.ts        sessions par cookie
│   ├── src/db.ts          schéma SQLite et comptes de démonstration
│   └── data/              base de données (créée au premier lancement)
└── Frontend/   Interface Next.js — port 3000
    ├── src/app/           pages (accueil, connexion, passager, chauffeur, admin)
    ├── src/components/    écrans et composants (carte Leaflet, formulaires…)
    └── src/lib/           appels API, lieux de Korhogo, tarifs, coordonnées de contact
```

Le Frontend relaie toutes les requêtes `/api/*` vers le Backend (voir `Frontend/next.config.ts`). Le navigateur ne parle donc qu'à un seul domaine, et le cookie de session y reste.

`pricing.ts` et `types.ts` existent dans les deux dossiers : gardez-les identiques.

## Démarrage

Prérequis : Node.js 22.

```bash
npm install            # à la racine (outil pour lancer les deux serveurs)
npm run install:all    # dépendances du Backend et du Frontend
npm run dev            # lance l'API (4000) et le site (3000)
```

Ouvrez ensuite http://localhost:3000.

En développement, chaque page est compilée à sa première visite (Turbopack) : comptez 20 à 30 s la première fois, puis l'affichage est quasi instantané.

En production (rapide dès la première visite) : `npm run build` puis `npm start`.

### Variables d'environnement

| Variable      | Dossier  | Défaut                   | Rôle                    |
|---------------|----------|--------------------------|-------------------------|
| `PORT`        | Backend  | `4000`                   | Port de l'API           |
| `SURPLACE_DB` | Backend  | `Backend/data/surplace.db` | Fichier SQLite        |
| `BACKEND_URL` | Frontend | `http://localhost:4000`  | Adresse de l'API        |

## Comptes de démonstration (PIN `1234`)

| Rôle      | Téléphone      | Mode de passe |
|-----------|----------------|---------------|
| Passager  | 07 00 00 00 01 | 1 2 3 4       |
| Chauffeur | 07 00 00 00 02 | 1 2 3 4       |
| Admin     | 05 74 32 88 18 | 2 0 0 2       |

Pour tester une course complète, ouvrez le passager et le chauffeur dans deux navigateurs différents (ou une fenêtre privée). Le chauffeur passe en ligne, le passager commande, puis le chauffeur accepte. En mode démo, la moto se déplace toute seule sur la carte.

## Fonctionnement

- **Tarif** : 50 FCFA/km, minimum 200 FCFA par course, arrondi aux 25 FCFA supérieurs. La distance est estimée à vol d'oiseau × 1,3. Ces valeurs se règlent dans `pricing.ts`.
- **Abonnement des chauffeurs** (aucune commission sur les courses) : Mensuel 1 000 FCFA, Annuel 10 000 FCFA (`SUBSCRIPTION_PLANS` dans `pricing.ts`). Sans abonnement actif, un chauffeur ne peut ni passer en ligne ni accepter de course ; à l'expiration, il est mis hors ligne (sauf s'il termine une course).
  1. Le chauffeur choisit sa formule dans l'application : une demande est créée.
  2. Il paie SURPLACE (espèces ou Mobile Money).
  3. L'admin clique sur « Paiement reçu » : l'abonnement s'active. L'admin peut aussi encaisser directement depuis la liste des chauffeurs.
  Un renouvellement s'ajoute à la fin de l'abonnement en cours.
- **Course** : demandée → acceptée → chauffeur arrivé → en course → terminée (ou annulée).
- Une demande sans chauffeur est annulée après 5 minutes.
- Si un chauffeur annule, la course retourne dans la file d'attente.
- Les chauffeurs voient les demandes dans un rayon de 10 km.
- Un nouveau chauffeur doit être validé par l'administrateur avant de pouvoir passer en ligne.
- **Temps réel** : Server-Sent Events (`/api/events`), avec une actualisation toutes les 15 s en secours.
- **Cartes et adresses** : OpenStreetMap (tuiles et recherche Nominatim limitée à Korhogo). Les lieux fréquents sont dans `Frontend/src/lib/places.ts` : leurs coordonnées sont approximatives, à vérifier sur le terrain.
- **Thème** : clair, sombre ou automatique (selon l'appareil). Le bouton est sur la page d'accueil, les pages de connexion et dans le menu utilisateur. La carte s'assombrit aussi.
- **Avis** : la page d'accueil affiche la note moyenne, la répartition des notes et les derniers commentaires (prénom + initiale du nom). L'admin peut masquer un avis.
- **Contact** : coordonnées dans `Frontend/src/lib/site.ts` (**valeurs provisoires à remplacer**). Les messages du formulaire arrivent dans le tableau de bord admin (limite de 3 messages par 10 minutes et par adresse IP).

## Administration

L'espace admin (`/admin`) a un menu à gauche (tiroir sur mobile) et un écran par sujet. Des pastilles signalent ce qui attend une action.

| Écran | Rôle |
|---|---|
| Vue d'ensemble | Chiffres clés, carte en direct, éléments à traiter, courses des 7 derniers jours |
| Courses | Filtres, recherche (n°, nom, téléphone, lieu), détail, annulation d'une course bloquée |
| Chauffeurs | Validation, refus, suspension, encaissement d'abonnement, historique |
| Passagers | Recherche, historique, blocage (le compte est déconnecté et ne peut plus se connecter) |
| Abonnements | Paiements à confirmer et historique des encaissements |
| Avis | Modération des avis affichés sur la page d'accueil |
| Messages | Messages du formulaire de contact |
| Administrateurs | Équipe d'administration (gérée par l'administrateur principal) |
| Mon compte | Nom, numéro et code PIN de l'administrateur |

Les actions sensibles (suspendre, bloquer, refuser, annuler, supprimer) demandent un second clic de confirmation.

**Suppressions** : course (hors course en cours), avis (la note du chauffeur est recalculée), message, abonnement (un paiement supprimé retire sa durée), passager et chauffeur. Un passager ou chauffeur qui a déjà des courses est **anonymisé** plutôt qu'effacé : nom et numéro supprimés, connexion impossible, numéro libéré, historique conservé.

**Administrateurs** : il y a toujours un administrateur principal. Lui seul peut ajouter, suspendre, réactiver ou supprimer un administrateur, et céder son rôle (il reste alors administrateur).

**Profils** : passagers et chauffeurs modifient leur nom, numéro et code PIN depuis « Mon profil » (menu ☰). Un chauffeur qui change de plaque ou de moto repasse « à valider ».

## E-mail de bienvenue

À l'inscription, l'adresse e-mail est **facultative**. Si elle est renseignée, un e-mail de bienvenue est envoyé au nouvel inscrit, avec un contenu différent pour un passager (comment commander, tarif) et pour un chauffeur (validation, abonnement, prochaines étapes). Chacun peut ajouter ou modifier son e-mail dans « Mon profil ».

**Configurer Gmail** (une seule fois) :

1. Copiez `Backend/.env.example` en `Backend/.env`.
2. Sur le compte Gmail de SURPLACE, activez la **validation en deux étapes**, puis créez un **mot de passe d'application** : https://myaccount.google.com/apppasswords
3. Dans `Backend/.env`, renseignez `SMTP_USER` (l'adresse Gmail) et `SMTP_PASS` (les 16 lettres du mot de passe d'application), ainsi que `SITE_URL` (l'adresse publique du site, pour les liens).
4. Redémarrez `npm run dev` : la console affiche « [e-mail] Envoi activé ».

Tant que Gmail n'est pas configuré, les e-mails ne partent pas : ils sont enregistrés dans `Backend/data/emails/` (ouvrez-les dans un navigateur pour les prévisualiser). Un échec d'envoi ne bloque jamais l'inscription ; il est noté dans la console. Gmail limite l'envoi à environ 500 e-mails par jour.

Le texte de l'e-mail se modifie dans `Backend/src/emails/welcome.ts`, et les coordonnées affichées dans `Backend/src/site.ts` (à garder identiques à `Frontend/src/lib/site.ts`).

## Pistes pour la suite

- Connexion par code SMS (OTP) au lieu du code PIN, et limitation des tentatives.
- Itinéraires routiers réels (OSRM, GraphHopper) pour la distance et le tracé.
- Paiement Mobile Money (Orange Money, MTN MoMo, Wave).
- Application mobile installable (PWA) et notifications push pour les chauffeurs.
- Base PostgreSQL et bus d'événements partagé (Redis) pour faire tourner plusieurs serveurs.
