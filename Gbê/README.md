# Gbê — Comprendre SURPLACE de A à Z

Ce dossier explique **tout le code** du projet SURPLACE : pourquoi il est organisé ainsi, où se trouve chaque fichier, à quoi il sert et comment les morceaux travaillent ensemble. Il se termine par des **propositions** pour faire évoluer l'application.

Il ne contient aucun code exécuté : vous pouvez le lire, le modifier ou le supprimer sans risque pour l'application.

## Ordre de lecture conseillé

| # | Fichier | Ce que vous y apprenez |
|---|---------|------------------------|
| 1 | [01-vue-d-ensemble.md](01-vue-d-ensemble.md) | Ce que fait l'application, ses trois programmes (Backend, Application, Administration), les technologies et pourquoi elles ont été choisies |
| 2 | [02-arborescence.md](02-arborescence.md) | L'arbre complet des dossiers et fichiers, pourquoi deux sites, les conventions de nommage |
| 3 | [03-backend.md](03-backend.md) | Le serveur API fichier par fichier (sessions, courses, invités, permis, abonnements, e-mails, réinitialisation du PIN admin) |
| 4 | [04-base-de-donnees.md](04-base-de-donnees.md) | Les tables SQLite, leurs colonnes, les relations, les migrations et les comptes de démonstration |
| 5 | [05-routes-api.md](05-routes-api.md) | Toutes les adresses `/api/...` : qui peut les appeler et ce qu'elles font |
| 6 | [06-frontend-pages.md](06-frontend-pages.md) | Le fonctionnement de Next.js et chaque page de l'Application et de l'Administration |
| 7 | [07-frontend-composants.md](07-frontend-composants.md) | Les composants React, les hooks et les utilitaires des deux sites |
| 8 | [08-parcours-complets.md](08-parcours-complets.md) | Des scénarios de bout en bout : commande avec ou sans compte, course complète, nouveau chauffeur, connexion admin… |
| 9 | [09-modifier-et-points-d-attention.md](09-modifier-et-points-d-attention.md) | « Je veux changer X : quel fichier ? », fichiers copiés, glossaire, points d'attention |
| 10 | [10-propositions.md](10-propositions.md) | Fonctionnalités et améliorations proposées, par priorité, avec une feuille de route |

## En une phrase

> Les **clients** (passagers, chauffeurs) utilisent l'**Application** (port 3000) ; l'**équipe** utilise l'**Administration** (port 3001). Les deux sites relaient leurs demandes de données (`/api/...`) au même **Backend** (port 4000), seul à lire et écrire dans la **base SQLite** et qui prévient les écrans en temps réel.

```
 Clients ──►  Application (3000)     ──┐
                                        ├──►  Backend Express (4000)  ──►  SQLite (Backend/data/surplace.db)
 Équipe  ──►  Administration (3001)  ──┘
```

## Conventions utilisées dans ces documents

- Les chemins sont donnés depuis la racine du projet (`d:\AppWeb\Surplace`), par exemple `Backend/src/rides.ts`. Quand un chemin commence par `src/` ou `lib/`, il s'applique au site dont parle la section.
- Les noms de fonctions sont écrits `ainsi()` : cherchez-les avec Ctrl+Maj+F dans VS Code.
- Les numéros de ligne sont volontairement évités : ils changent à chaque modification, les noms de fonctions restent.
