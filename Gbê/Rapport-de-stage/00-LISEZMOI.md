# Rapport de stage — mode d'emploi

Ce dossier contient un **rapport de stage complet** dont le thème est le projet SURPLACE. Il suit le plan habituel d'un rapport de fin de formation en informatique, avec une étude **MERISE** complète :

| Fichier | Contenu |
|---|---|
| [01-pages-liminaires.md](01-pages-liminaires.md) | Page de garde, dédicace, remerciements, avant-propos, sommaire, sigles, listes des figures et tableaux |
| [02-introduction.md](02-introduction.md) | Introduction générale |
| [03-partie1-cadre-et-existant.md](03-partie1-cadre-et-existant.md) | **Première partie** : structure d'accueil, présentation du projet, étude et critique de l'existant, solution retenue |
| [04-partie2-merise-donnees.md](04-partie2-merise-donnees.md) | **Deuxième partie (1)** : méthode MERISE, règles de gestion, **dictionnaire des données**, **dépendances fonctionnelles et GDF**, **MCD**, **MLD-R**, **MPD** |
| [05-partie2-merise-traitements.md](05-partie2-merise-traitements.md) | **Deuxième partie (2)** : diagramme de contexte et **diagramme des flux (MCC)**, **MCT**, **MOT**, **SAT** (schémas d'accès théorique) |
| [06-partie3-realisation.md](06-partie3-realisation.md) | **Troisième partie** : outils, architecture, sécurité, présentation de l'application, tests, déploiement, coût, difficultés |
| [07-conclusion-et-annexes.md](07-conclusion-et-annexes.md) | Conclusion générale, perspectives, bibliographie et webographie, glossaire, annexes, table des matières |

## Ce que vous devez compléter

Tous les endroits à compléter sont signalés par **`[À COMPLÉTER : …]`**. Recherchez ce texte (Ctrl+Maj+F dans VS Code) pour n'en oublier aucun :

- vos nom, prénoms, école, filière, niveau, année académique ;
- la **structure d'accueil** (nom, historique, missions, organigramme, adresse), le **maître de stage** et l'**encadreur pédagogique** ;
- les **dates du stage** et le planning réel ;
- les **résultats de votre enquête de terrain** auprès des passagers et des conducteurs de taxi-moto (nombre de personnes interrogées, réponses). Aucun chiffre n'a été inventé : remplacez les emplacements par vos propres données ;
- les **captures d'écran** de l'application (emplacements « Figure X : capture… ») ;
- les coûts réels (taux de change du jour, devis).

## Les schémas

Les schémas (GDF, MCD, MCT, MOT, diagramme des flux…) sont dessinés ici en texte, pour être lisibles partout. **Pour le rapport imprimé, redessinez-les** avec un logiciel MERISE :

- **Looping** (gratuit, en français, très utilisé dans les écoles) : MCD, MLD et script SQL générés automatiquement ;
- ou JMerise, AnalyseSI, Win'Design, ou draw.io pour le MCC, le MCT et le MOT.

Le texte du rapport donne toutes les entités, associations, cardinalités, opérations et règles nécessaires pour les reproduire à l'identique.

## Mettre le rapport dans Word

**La version Word est déjà prête : [Rapport-de-stage-SURPLACE.docx](Rapport-de-stage-SURPLACE.docx)** (77 pages, styles de titres, table des matières automatique, numéros de page, zones « [À COMPLÉTER] » surlignées en jaune). Après vos modifications, mettez à jour la table des matières : clic droit dessus › Mettre à jour les champs › Mettre à jour toute la table.

Attention : si vous modifiez ensuite les fichiers `.md`, le fichier Word n'est pas mis à jour automatiquement. Choisissez une seule version de travail (de préférence le Word).

Pour repartir des fichiers Markdown :

Le plus simple : copier-coller chaque fichier dans Word, puis appliquer les styles « Titre 1 », « Titre 2 »… et générer le sommaire automatique (Références › Table des matières).

Ou, avec l'outil gratuit **Pandoc**, en une commande depuis ce dossier :

```bash
pandoc 01-pages-liminaires.md 02-introduction.md 03-partie1-cadre-et-existant.md 04-partie2-merise-donnees.md 05-partie2-merise-traitements.md 06-partie3-realisation.md 07-conclusion-et-annexes.md -o Rapport-de-stage-SURPLACE.docx
```

## Une précision sur le « SAT »

Dans ce rapport, **SAT** est traité comme le **Schéma (ou Structure) d'Accès Théorique** de MERISE : pour chaque traitement important, il décrit les entités lues ou modifiées et l'ordre des accès (chapitre 5, section 5.5). Si votre enseignant entend autre chose par SAT, adaptez cette section ou demandez-moi de la réécrire.

## Une remarque d'honnêteté

Ce rapport décrit fidèlement le code de l'application. Relisez-le entièrement, reformulez-le avec vos mots là où vous le souhaitez, et assurez-vous de pouvoir expliquer chaque partie à l'oral. Si votre établissement demande de mentionner les outils d'aide utilisés (assistants de programmation ou de rédaction), indiquez-le dans l'avant-propos ou la méthodologie.
