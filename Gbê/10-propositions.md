# 10. Propositions pour faire évoluer SURPLACE

## Bilan : ce qui est réalisé

Toutes les propositions ci-dessous ont été intégrées, **sauf les paiements** (exclus à votre demande) et la montée en charge sur plusieurs serveurs (inutile pour l'instant).

| Proposition | État | Où le voir |
|---|---|---|
| Limiter les tentatives de connexion | ✅ | `limits.ts` ; message « Trop de tentatives » |
| Vérification du numéro par SMS | ✅ (fournisseur Orange à configurer) | Inscription, commande sans compte, PIN oublié, changement de numéro |
| PIN oublié sans l'administrateur | ✅ | `/pin-oublie` (Application et Administration) |
| Application installable + notifications push | ✅ | Menu ☰ › Installer / Notifications sur le téléphone |
| Partage de course et bouton d'urgence | ✅ | Pendant une course ; Administration › Urgences |
| Photos des documents du chauffeur, dates d'expiration | ✅ | Profil et documents ; Administration › Chauffeurs |
| Sauvegardes automatiques | ✅ | Administration › Système et sauvegardes |
| Lieux favoris, dernières destinations | ✅ | Écran passager |
| Commander pour quelqu'un d'autre | ✅ | « 👤 Un proche » |
| Réservation à l'avance | ✅ | « 🕒 Plus tard » |
| Réclamation sur une course | ✅ | Historique › Signaler un problème ; Administration › Réclamations |
| Prix et trajet par la route (OSRM) | ✅ (serveur OSRM à installer) | `routing.ts`, `deploy/DEPLOIEMENT.md` |
| Mode simple et annonces vocales | ✅ français ; dioula / sénoufo : **fichiers audio à enregistrer** | Menu ☰ |
| Alerte sonore, vibration, écran allumé | ✅ | Écran chauffeur |
| Attribution automatique au plus proche | ✅ | Administration › Tarifs et réglages |
| Rappels d'abonnement | ✅ | Notifications J-3 et J-1 (et SMS) |
| Noter le passager | ✅ | Fin de course côté chauffeur |
| Carte des zones demandées | ✅ | « 🔥 Zones demandées » ; Rapports |
| Statistiques du chauffeur | ✅ | Mes gains et statistiques |
| Économie de données et de batterie | ✅ | Menu ☰ (chauffeurs) ; photos réduites avant envoi |
| Parrainage | ✅ en **jours d'abonnement** (pas d'argent) | Profil et documents |
| Tarifs modifiables, majoration nuit / pluie | ✅ | Administration › Tarifs et réglages |
| Journal des actions | ✅ | Administration › Journal |
| Rôles d'administrateur | ✅ | Administration › Administrateurs |
| Exports Excel, rapports mensuels | ✅ | Administration › Rapports et exports |
| Messages groupés | ✅ | Administration › Messages groupés |
| Gestion des lieux fréquents | ✅ | Administration › Lieux fréquents |
| Mise en ligne (HTTPS, deux domaines, redémarrage auto) | ✅ fichiers prêts | `deploy/` |
| Fin des copies de fichiers | ✅ | `Commun/` + `scripts/sync-commun.mjs` |
| Tests automatiques | ✅ 17 parcours | `npm test` |
| Surveillance | ✅ | `/api/health`, écran Système |
| Paiement Mobile Money, pourboires, abonnement payé en ligne | ❌ exclu | — |
| Codes promo passagers | ❌ (impliquerait de rembourser les chauffeurs) | — |
| Plusieurs serveurs (PostgreSQL, Redis) | ⏸️ plus tard, si nécessaire | — |

Le reste de ce fichier est la liste d'origine, conservée pour mémoire.

---

Des fonctionnalités et améliorations classées par priorité, pensées pour le contexte de Korhogo : beaucoup d'utilisateurs sur téléphone Android, réseau mobile parfois faible, paiement en espèces et Mobile Money, sécurité à moto.

**Effort** : 🟢 petit (1 à 3 jours) · 🟡 moyen (1 à 2 semaines) · 🔴 important (plusieurs semaines).

---

## Ce que je recommande de faire en premier

| # | Proposition | Pourquoi maintenant | Effort |
|---|---|---|---|
| 1 | **Limiter les tentatives de connexion** | Un PIN de 4 chiffres se devine en quelques minutes par un robot. C'est la faille la plus sérieuse aujourd'hui. | 🟢 |
| 2 | **Vérification du numéro par SMS (code à 6 chiffres)** | Rend fiables les commandes sans compte, permet « PIN oublié » sans l'administrateur, et empêche d'inscrire le numéro de quelqu'un d'autre. | 🟡 |
| 3 | **Application installable (PWA) + notifications** | Le chauffeur doit être prévenu d'une demande même écran éteint ; le passager quand la moto arrive. Une icône sur l'écran d'accueil, sans passer par le Play Store. | 🟡 |
| 4 | **Partage de course et bouton d'urgence** | La sécurité est la première inquiétude des clients de taxi-moto, en particulier des femmes et des parents. Un argument commercial fort. | 🟢 |
| 5 | **Photos des documents du chauffeur** (permis, carte grise, pièce d'identité, photo du visage) | Le numéro de permis seul ne suffit pas à vérifier. La photo du chauffeur rassure aussi le passager. | 🟡 |
| 6 | **Sauvegarde automatique de la base** | Toutes les données sont dans un seul fichier : une panne de disque efface tout. | 🟢 |

---

## Pour les passagers

| Proposition | Détail | Effort |
|---|---|---|
| **Partager ma course** | Lien de suivi en direct à envoyer par WhatsApp à un proche (position de la moto, plaque, nom du chauffeur), valable jusqu'à la fin de la course. | 🟢 |
| **Bouton d'urgence** | Pendant la course : appel direct à un numéro d'urgence SURPLACE et envoi de la position à un contact de confiance ; l'admin voit l'alerte en rouge. | 🟢 |
| **Lieux favoris** | « Maison », « Travail », « Marché » enregistrés ; dernières destinations proposées en premier. Gain de temps énorme pour les trajets quotidiens. | 🟢 |
| **Commander pour quelqu'un d'autre** | Un parent commande pour son enfant ou un proche : nom et numéro du vrai passager transmis au chauffeur. | 🟢 |
| **Réservation à l'avance** | Programmer une course (ex. 6 h pour la gare routière) ; les chauffeurs la voient 15 min avant. | 🟡 |
| **Paiement Mobile Money** | Orange Money, MTN MoMo, Moov Money, Wave, en plus des espèces. Évite les problèmes de monnaie. Passe par un agrégateur de paiement ivoirien (CinetPay, PayDunya…). | 🔴 |
| **Pourboire** | Après la course, ajout facultatif de 50 / 100 / 200 FCFA (surtout utile avec le Mobile Money). | 🟢 |
| **Réclamation sur une course** | Depuis l'historique : « Problème avec cette course » (objet perdu, prix, comportement), qui arrive dans l'admin rattachée à la course. | 🟢 |
| **Prix et trajet plus justes** | Itinéraire routier réel (OSRM, auto-hébergeable et gratuit) au lieu de « vol d'oiseau × 1,3 », et tracé sur la carte. | 🟡 |
| **Interface très simple / vocale** | Gros boutons, pictogrammes, messages audio en dioula ou en sénoufo pour les personnes qui lisent difficilement le français. | 🟡 |
| **Parrainage et codes promo** | « Invitez un ami : 100 FCFA de réduction chacun ». Bon levier de croissance au lancement. | 🟡 |

## Pour les chauffeurs

| Proposition | Détail | Effort |
|---|---|---|
| **Alerte sonore + vibration** à chaque nouvelle demande, et écran maintenu allumé en ligne (Wake Lock). | Aujourd'hui, le chauffeur doit regarder l'écran. | 🟢 |
| **Attribution automatique** | Proposer la demande au chauffeur le plus proche pendant 20 s, puis au suivant, au lieu du « premier qui clique ». Plus juste et plus rapide. | 🟡 |
| **Rappels d'abonnement** | Message 3 jours et 1 jour avant l'expiration ; bouton « Renouveler ». | 🟢 |
| **Payer l'abonnement en Mobile Money** | Activation immédiate, sans attendre la confirmation de l'admin. | 🔴 (avec le paiement passager) |
| **Noter le passager** | Évaluation dans les deux sens ; les passagers mal notés sont signalés à l'admin. | 🟢 |
| **Carte des zones demandées** | Où et quand il y a le plus de demandes (marché le matin, université le soir) pour mieux se positionner. | 🟡 |
| **Statistiques personnelles** | Heures en ligne, gains par jour et par semaine, taux d'acceptation, note moyenne détaillée. | 🟢 |
| **Économie de données et de batterie** | Envoi de la position moins fréquent quand la moto est à l'arrêt ; carte allégée. | 🟢 |

## Pour l'administration

| Proposition | Détail | Effort |
|---|---|---|
| **Tarifs modifiables depuis l'admin** | Prix au km, minimum, abonnements, **majoration de nuit ou de pluie**, sans toucher au code ni redémarrer. | 🟡 |
| **Documents avec date d'expiration** | Permis, assurance, carte grise : alerte quand un document expire, suspension automatique possible. | 🟡 |
| **Journal des actions** | Qui a validé, suspendu, encaissé, supprimé, et quand. Indispensable dès qu'il y a plusieurs administrateurs. | 🟢 |
| **Rôles d'administrateur** | Opérateur (courses, chauffeurs), comptable (abonnements), modérateur (avis, messages), au lieu d'un accès total pour tous. | 🟡 |
| **Exports Excel / CSV** | Courses, encaissements d'abonnements, chauffeurs : pour la comptabilité et les rapports. | 🟢 |
| **Rapports mensuels** | Chiffre d'affaires des abonnements, courses par jour, chauffeurs actifs, nouveaux passagers, taux d'annulation. | 🟡 |
| **Messages groupés** | Envoyer une information à tous les chauffeurs (SMS ou notification) : fête, travaux, nouvelle règle. | 🟡 |
| **Gestion des lieux fréquents** | Ajouter ou corriger les lieux de Korhogo depuis l'admin au lieu de `places.ts`. | 🟢 |
| **Suivi des alertes d'urgence** | Écran dédié aux boutons d'urgence déclenchés, avec la position en direct. | 🟢 (avec le bouton d'urgence) |

## Technique et fiabilité

| Proposition | Détail | Effort |
|---|---|---|
| **Limitation des tentatives** sur la connexion (ex. 5 essais puis blocage 15 min par numéro et par IP), et plus largement sur toute l'API. | Sécurité de base. | 🟢 |
| **Sauvegardes** | Copie quotidienne de `surplace.db` (commande `VACUUM INTO` de SQLite) vers un autre disque ou un stockage en ligne, avec conservation de 30 jours. | 🟢 |
| **Mise en ligne** | Serveur VPS, HTTPS (Let's Encrypt), noms de domaine `surplace.ci` et `admin.surplace.ci`, redémarrage automatique (PM2 ou systemd). | 🟡 |
| **Supprimer les copies de fichiers** | Un paquet commun (npm workspaces) pour `types.ts`, `pricing.ts`, la carte, le thème… partagé par le Backend et les deux sites. | 🟡 |
| **Tests automatiques** | Tests du cycle de vie d'une course, des abonnements et des droits d'accès (Vitest), et d'un parcours complet dans le navigateur (Playwright). Évitent les régressions. | 🟡 |
| **Surveillance** | Alerte si `/api/health` ne répond plus ; journal des erreurs. | 🟢 |
| **Montée en charge** | PostgreSQL et Redis (bus temps réel partagé) le jour où un seul serveur ne suffit plus. | 🔴 |

---

## Proposition de feuille de route

```
Mois 1 — Sécurité et lancement
  limitation des tentatives · sauvegardes · mise en ligne (HTTPS, deux domaines)
  partage de course + bouton d'urgence · alerte sonore chauffeur

Mois 2 — Confiance
  vérification SMS (inscription, invités, PIN oublié) · photos des documents chauffeur
  journal des actions admin · lieux favoris

Mois 3 — Confort et croissance
  PWA + notifications · tarifs dans l'admin (nuit / pluie) · rappels d'abonnement
  exports Excel · parrainage

Ensuite
  paiement Mobile Money · attribution automatique · itinéraires routiers réels
  interface vocale en langues locales
```
