# Gbê — Comprendre SURPLACE de A à Z

Ce dossier explique **tout le code** du projet SURPLACE : pourquoi il est organisé ainsi, où se trouve chaque fichier, à quoi il sert et comment les morceaux travaillent ensemble.

Il ne contient aucun code exécuté : vous pouvez le lire, le modifier ou le supprimer sans risque pour l'application.

## Ordre de lecture conseillé

| # | Fichier | Ce que vous y apprenez |
|---|---------|------------------------|
| 1 | [01-vue-d-ensemble.md](01-vue-d-ensemble.md) | Ce que fait l'application, les 3 « étages » (navigateur, Frontend, Backend), les technologies et pourquoi elles ont été choisies |
| 2 | [02-arborescence.md](02-arborescence.md) | L'arbre complet des dossiers et fichiers, avec le rôle de chacun et les conventions de nommage |
| 3 | [03-backend.md](03-backend.md) | Le serveur API fichier par fichier (Express, sessions, courses, abonnements, e-mails…) |
| 4 | [04-base-de-donnees.md](04-base-de-donnees.md) | Les tables SQLite, leurs colonnes, les relations, les migrations et les comptes de démonstration |
| 5 | [05-routes-api.md](05-routes-api.md) | La liste de toutes les adresses `/api/...` : qui peut les appeler et ce qu'elles font |
| 6 | [06-frontend-pages.md](06-frontend-pages.md) | Le fonctionnement de Next.js (App Router) et chaque page du site |
| 7 | [07-frontend-composants.md](07-frontend-composants.md) | Les composants React, les hooks et les utilitaires (`lib/`) |
| 8 | [08-parcours-complets.md](08-parcours-complets.md) | Des scénarios suivis de bout en bout : inscription, commande d'une course, temps réel, abonnement, action admin… |
| 9 | [09-modifier-et-points-d-attention.md](09-modifier-et-points-d-attention.md) | « Je veux changer X : quel fichier ? », un glossaire, et les incohérences repérées dans le code |

## En une phrase

> Le **navigateur** affiche les pages construites par le **Frontend** (Next.js, port 3000). Toutes les demandes de données (`/api/...`) sont relayées par le Frontend vers le **Backend** (Express, port 4000), qui est le seul à lire et écrire dans la **base SQLite** et qui prévient les écrans en temps réel.

```
 Navigateur  ──►  Frontend Next.js (3000)  ──►  Backend Express (4000)  ──►  SQLite (Backend/data/surplace.db)
   (pages,          (construit les pages,          (règles métier,              (toutes les données)
    carte)           relaie /api/*)                 sécurité, temps réel)
```

## Conventions utilisées dans ces documents

- Les chemins sont donnés depuis la racine du projet (`d:\AppWeb\Surplace`), par exemple `Backend/src/rides.ts`.
- Les noms de fonctions sont écrits `ainsi()` : cherchez-les avec Ctrl+Maj+F dans VS Code pour tomber dessus directement.
- Les numéros de ligne sont volontairement évités : ils changent à chaque modification, les noms de fonctions restent.
