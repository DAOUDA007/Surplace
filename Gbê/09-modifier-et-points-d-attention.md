# 9. Où modifier quoi, glossaire et points d'attention

## « Je veux changer… » → où ?

Beaucoup de réglages se font maintenant **sans toucher au code**, dans l'Administration.

| Je veux changer… | Où | Remarque |
|---|---|---|
| Prix au km, minimum, prise en charge, arrondi | Administration › **Tarifs et réglages** | Valeurs par défaut (premier démarrage) : `Commun/lib/pricing.ts` |
| Majoration de nuit (heures, %) ou de pluie | Administration › Tarifs et réglages | La pluie s'active à la main |
| Prix des abonnements | Administration › Tarifs et réglages | |
| Mode d'attribution, délai de réponse, chauffeurs sollicités | Administration › Tarifs et réglages | |
| Jours offerts par parrainage | Administration › Tarifs et réglages | 0 = désactivé |
| Rendre les documents obligatoires | Administration › Tarifs et réglages | |
| Lieux fréquents de Korhogo | Administration › **Lieux fréquents** | |
| Coordonnées de contact, ligne d'urgence, numéros des secours | `Commun/lib/site.ts` | Une seule version pour l'accueil, les e-mails et l'écran d'urgence |
| Délai d'annulation automatique (5 min) | `Backend/src/rides.ts` (`REQUEST_TIMEOUT_MIN`) | |
| Rayon des demandes (10 km) | `Backend/src/rides.ts` (`DISPATCH_RADIUS_KM`) | |
| Délai de réservation (20 min à 7 jours, visible 15 min avant) | `Backend/src/rides.ts` (`SCHEDULE_*`) | |
| Limites anti-abus (connexion, SMS, commandes invitées…) | `Backend/src/limits.ts`, `otp.ts`, `app.ts` | |
| Documents demandés aux chauffeurs | `Commun/lib/types.ts` (`DOCUMENT_LABELS`, `REQUIRED_DOCUMENTS`, `EXPIRING_DOCUMENTS`) | + la contrainte `CHECK` de la table `driver_documents` |
| Catégories de réclamation | `Commun/lib/types.ts` (`COMPLAINT_CATEGORIES`) | |
| Droits des rôles d'administrateur | `Commun/lib/permissions.ts` | |
| Textes des annonces vocales | `Commun/lib/preferences.ts` (`ANNOUNCEMENTS`) | Fichiers audio : `Application/public/annonces/` |
| Durée d'une session (30 jours) | `Backend/src/auth.ts` (`SESSION_DAYS`) | |
| Couleurs, mode sombre, mode simple | `Commun/styles/globals.css` | |
| Icônes de l'application installable | `Commun/public/icon-*.png` | Remplacez par votre logo (mêmes tailles : 192 et 512 px) |
| Textes de la page d'accueil | `Application/src/app/page.tsx` | |
| Texte de l'e-mail de bienvenue | `Backend/src/emails/welcome.ts` | |
| Fournisseur SMS, clés push, serveur d'itinéraires | `Backend/.env` (modèle : `.env.example`) | |
| Ajouter un écran admin | `Administration/src/app/(espace)/<nom>/page.tsx` + composant + ligne dans `NAV` (`AdminShell.tsx`) + route dans `Backend/src/app.ts` (`adminGet` / `adminPost` avec le bon droit) | |
| Ajouter une colonne en base | `Backend/src/db.ts` › `migrateFeatures()` avec `addColumn(…)` | Les bases existantes sont mises à jour au démarrage |
| Ajouter un champ partagé (ex. dans `Ride`) | `Commun/lib/types.ts`, `toRide()` dans `rides.ts`, la requête SQL | |

**Règle d'or des fichiers partagés** : un fichier dont la première ligne est « ⚠️ Fichier copié depuis Commun/… » ne se modifie **pas** sur place (vos changements seraient écrasés). Modifiez l'original dans `Commun/`.

## Glossaire

| Terme | Explication |
|---|---|
| **API** | Adresses `/api/...` que les sites appellent pour lire ou modifier des données (JSON). |
| **Backend / Application / Administration** | Le serveur ; le site des clients (3000) ; le site de l'équipe (3001). |
| **Commun** | Dossier des fichiers partagés, recopiés automatiquement dans les trois projets. |
| **Proxy / rewrite** | Un site reçoit `/api/...` et le transmet au Backend. |
| **Session / cookie** | Preuve de connexion gardée par le navigateur. |
| **Passager invité** | A commandé sans compte ; reconnu sur son téléphone par le cookie. |
| **Code SMS (OTP)** | Code à usage unique envoyé par SMS pour prouver qu'on possède un numéro. |
| **Limitation (rate limit)** | Nombre maximum d'essais sur une durée ; au-delà, refus temporaire (429). |
| **Hachage, sel** | Transformation à sens unique (PIN, codes SMS) ; impossible de retrouver l'original. |
| **Attribution (dispatch)** | Choix du chauffeur à qui proposer une demande. |
| **Proposition (offre)** | Demande réservée quelques secondes à un chauffeur, qui l'accepte ou la refuse. |
| **Réservation** | Course commandée à l'avance pour une heure précise. |
| **Majoration** | Hausse du prix en pourcentage (nuit, pluie). |
| **OSRM** | Logiciel libre qui calcule des itinéraires routiers à partir d'OpenStreetMap. |
| **Notification push** | Message affiché par le téléphone même quand l'application est fermée. |
| **VAPID** | Clés qui authentifient le serveur auprès des services de notifications push. |
| **Service worker** | Petit programme installé par le site dans le navigateur (`sw.js`) : notifications, page hors connexion. |
| **PWA (application installable)** | Site qu'on peut ajouter à l'écran d'accueil comme une application, sans Play Store. |
| **Wake Lock** | Demande au téléphone de ne pas éteindre l'écran. |
| **SSE (Server-Sent Events)** | Connexion qui reste ouverte pour recevoir les événements en temps réel. |
| **Journal (audit)** | Trace de qui a fait quoi dans l'administration. |
| **Rôle / droit** | Ce qu'un administrateur a le droit de voir et de faire. |
| **CSV** | Fichier texte tabulaire, ouvert par Excel. |
| **Migration** | Mise à jour automatique de la structure de la base. |
| **Transaction** | Groupe d'opérations en base « tout ou rien ». |
| **Test automatique** | Programme qui vérifie qu'un parcours fonctionne toujours (`npm test`). |
| **Groupe de routes** | Dossier entre parenthèses (Next.js), absent de l'adresse. |
| **Composant serveur / client** | Code React exécuté sur le serveur Next.js / dans le navigateur. |
| **Hook** | Fonction React `useXxx` qui ajoute un comportement à un composant. |
| **Géocodage** | Adresse ↔ coordonnées (Nominatim). |
| **Haversine** | Formule de distance entre deux points GPS. |

## Points d'attention

### Corrigés depuis la version précédente

- ✅ Les coordonnées de contact de l'accueil et des e-mails sont désormais **identiques** (une seule version dans `Commun/lib/site.ts`).
- ✅ Plus de copies à synchroniser à la main (`Commun/` + `sync-commun.mjs`).
- ✅ Les tentatives de connexion sont **limitées**.
- ✅ « Code PIN oublié » par SMS, pour tous les comptes.
- ✅ Sauvegardes automatiques ; tests automatiques.

### Reste à faire / à vérifier

1. **Compte admin de démonstration** (`07 00 00 00 00` / `1234` sur une base neuve) : à changer avant la mise en service ; supprimer aussi les comptes de démo passager et chauffeur.
2. **Fournisseur SMS** : tant qu'il n'est pas configuré, en production, les numéros ne sont pas vérifiés et « PIN oublié » ne fonctionne pas (l'outil `npm run reset-admin-pin` reste disponible pour l'administrateur principal).
3. **Icônes** de l'application installable : provisoires (« S » blanc sur fond orange), à remplacer par le vrai logo.
4. **Annonces vocales en dioula et sénoufo** : le système est prêt, mais les fichiers audio sont à **enregistrer** (liste dans `Application/public/annonces/LISEZMOI.txt`). En attendant, l'annonce est dite en français.
5. **Dépendance `"surplace": "file:.."`** dans `Backend/package.json` et `Application/package.json` : inutilisée, à retirer.
6. **Adresse IP réelle derrière nginx** : les limites par IP supposent que l'en-tête `X-Forwarded-For` est bien transmis (configuré dans `deploy/nginx.conf`). Après la mise en ligne, vérifiez dans le Journal que les adresses IP sont variées (et pas toutes `127.0.0.1`).
7. **Données de la base hors du fichier** : photos des documents (`data/uploads/`) et clés push (`data/vapid.json`) sont à sauvegarder avec la base.

### Choisis et non réalisés (volontairement)

- **Paiements** (Mobile Money, pourboires) : exclus à votre demande. Pour la même raison, **pas de codes promo pour les passagers** : une réduction ferait perdre de l'argent au chauffeur, et SURPLACE devrait le rembourser. Le parrainage récompense en **jours d'abonnement**.
- **Plusieurs serveurs** (PostgreSQL, Redis) : inutile tant qu'un serveur suffit (plusieurs milliers de courses par jour). Le bus temps réel, les limites et l'attribution fonctionnent dans **un seul** processus Backend : ne lancez pas deux copies de l'API.

### Sous Windows, en développement

Le démarrage de Next.js peut être lent et produire des erreurs `EPERM … rename … .next`. Ce n'est pas un bug du code : arrêtez les serveurs, supprimez le dossier `.next` du site concerné et relancez. Exclure le dossier du projet de l'analyse en temps réel de Windows Defender accélère nettement la compilation.

## Pour aller plus loin

- `npm test` après chaque modification du Backend.
- `npm run sync -- --check` (ou `node scripts/sync-commun.mjs --check`) pour vérifier les fichiers partagés.
- Outils de développement du navigateur (F12) → **Réseau** et **Application › Service workers / Manifest**.
- Suivre un parcours de [08-parcours-complets.md](08-parcours-complets.md) en ouvrant chaque fichier cité.
