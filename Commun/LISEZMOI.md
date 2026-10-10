# Commun/ — fichiers partagés

Ce dossier contient la **seule version** des fichiers utilisés à la fois par le Backend, l'Application et l'Administration
(types de données, tarifs, carte, thème, formulaires communs, service worker, icônes…).

**Modifiez toujours le fichier ici**, jamais ses copies : elles portent en première ligne
« ⚠️ Fichier copié depuis Commun/… » et sont réécrites automatiquement à chaque `npm run dev`, `npm run build` ou `npm start`.

Pour recopier à la main : `node scripts/sync-commun.mjs` (à la racine du projet).
Pour vérifier que les copies sont à jour : `node scripts/sync-commun.mjs --check` (aussi vérifié par les tests du Backend).

La liste « fichier → dossiers de destination » est en haut de `scripts/sync-commun.mjs`.
