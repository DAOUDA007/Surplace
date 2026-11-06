<!-- ===================== PAGE DE GARDE ===================== -->

**RÉPUBLIQUE DE CÔTE D'IVOIRE**
Union – Discipline – Travail

**MINISTÈRE DE L'ENSEIGNEMENT SUPÉRIEUR ET DE LA RECHERCHE SCIENTIFIQUE**
[À COMPLÉTER : ou ministère de tutelle de votre établissement]

[À COMPLÉTER : logo et nom de l'établissement]

[À COMPLÉTER : logo et nom de la structure d'accueil]

---

**RAPPORT DE STAGE**

En vue de l'obtention du [À COMPLÉTER : diplôme — ex. Brevet de Technicien Supérieur (BTS) / Licence professionnelle]
Filière : [À COMPLÉTER : ex. Informatique Développeur d'Applications (IDA)]

---

# THÈME :
# CONCEPTION ET RÉALISATION D'UNE APPLICATION WEB DE COMMANDE ET DE GESTION DE TAXIS-MOTOS À KORHOGO : « SURPLACE »

---

| Présenté par | Sous la direction de |
|---|---|
| **[À COMPLÉTER : NOM et Prénoms de l'étudiant(e)]** | **Encadreur pédagogique :** [À COMPLÉTER : M./Mme NOM Prénoms, titre] |
| [À COMPLÉTER : Filière, niveau] | **Maître de stage :** [À COMPLÉTER : M./Mme NOM Prénoms, fonction] |

Période du stage : du [À COMPLÉTER : jj/mm/aaaa] au [À COMPLÉTER : jj/mm/aaaa]

**Année académique [À COMPLÉTER : 2025-2026]**

<div style="page-break-after: always"></div>

<!-- ===================== DÉDICACE ===================== -->

# DÉDICACE

[À COMPLÉTER — exemple à personnaliser :]

*Je dédie ce travail*

*À mes parents, pour leurs sacrifices, leur amour et leur soutien constant tout au long de mes études ;*

*À mes frères et sœurs, pour leurs encouragements ;*

*À toutes les personnes qui, de près ou de loin, ont cru en moi.*

<div style="page-break-after: always"></div>

<!-- ===================== REMERCIEMENTS ===================== -->

# REMERCIEMENTS

[À COMPLÉTER — modèle à adapter :]

Au terme de ce travail, je tiens à exprimer ma profonde gratitude à toutes les personnes qui ont contribué à sa réalisation.

Mes remerciements s'adressent particulièrement :

- au **Directeur / à la Directrice** de [À COMPLÉTER : structure d'accueil], pour m'avoir accueilli(e) au sein de sa structure ;
- à **[À COMPLÉTER : maître de stage]**, mon maître de stage, pour sa disponibilité, ses conseils et la confiance qu'il / elle m'a accordée tout au long du projet ;
- à **[À COMPLÉTER : encadreur pédagogique]**, mon encadreur pédagogique, pour son suivi, ses orientations et sa rigueur ;
- au **Fondateur / à la Direction** de [À COMPLÉTER : établissement], ainsi qu'à l'ensemble du corps enseignant et administratif, pour la qualité de la formation reçue ;
- aux **conducteurs de taxis-motos et aux usagers de Korhogo** qui ont accepté de répondre à mes questions et de tester l'application ;
- à ma famille et à mes camarades de promotion, pour leur soutien moral.

Que chacun trouve ici l'expression de ma sincère reconnaissance.

<div style="page-break-after: always"></div>

<!-- ===================== AVANT-PROPOS ===================== -->

# AVANT-PROPOS

[À COMPLÉTER : présentation de l'établissement — modèle :]

[Nom de l'établissement] est un établissement d'enseignement supérieur [privé / public] créé en [année] et situé à [ville]. Il forme des techniciens et cadres dans les domaines de [domaines]. Agréé par l'État de Côte d'Ivoire, il prépare notamment au [diplôme].

La formation au [diplôme] en [filière] se déroule sur [durée]. Elle associe des enseignements théoriques et pratiques et se termine par un **stage en entreprise** d'une durée de [durée]. Ce stage permet à l'étudiant de confronter ses connaissances aux réalités du monde professionnel et de les mettre en œuvre dans un projet concret. Il donne lieu à la rédaction d'un rapport soutenu devant un jury.

C'est dans ce cadre que nous avons effectué notre stage au sein de [structure d'accueil], du [date] au [date]. Le thème qui nous a été confié est : **« Conception et réalisation d'une application web de commande et de gestion de taxis-motos à Korhogo : SURPLACE »**.

Ce document présente le travail réalisé : l'analyse du fonctionnement actuel du transport par taxi-moto, la conception du système d'information selon la méthode MERISE, puis la réalisation, le test et la mise en ligne de l'application.

[À COMPLÉTER si exigé par l'établissement : mention des outils d'aide à la programmation ou à la rédaction utilisés.]

<div style="page-break-after: always"></div>

<!-- ===================== SOMMAIRE ===================== -->

# SOMMAIRE

DÉDICACE
REMERCIEMENTS
AVANT-PROPOS
LISTE DES SIGLES ET ABRÉVIATIONS
LISTE DES FIGURES
LISTE DES TABLEAUX
INTRODUCTION GÉNÉRALE

**PREMIÈRE PARTIE : CADRE DE L'ÉTUDE ET ANALYSE DE L'EXISTANT**
- Chapitre 1 : Présentation de la structure d'accueil
- Chapitre 2 : Présentation du projet
- Chapitre 3 : Étude et critique de l'existant

**DEUXIÈME PARTIE : ANALYSE ET CONCEPTION DU SYSTÈME D'INFORMATION (MÉTHODE MERISE)**
- Chapitre 4 : Étude des données — règles de gestion, dictionnaire des données, dépendances fonctionnelles, MCD, MLD-R, MPD
- Chapitre 5 : Étude des traitements — diagramme de flux, MCT, MOT, SAT

**TROISIÈME PARTIE : RÉALISATION ET MISE EN ŒUVRE**
- Chapitre 6 : Environnement de développement et architecture
- Chapitre 7 : Présentation de l'application
- Chapitre 8 : Tests, déploiement, coût et bilan

CONCLUSION GÉNÉRALE ET PERSPECTIVES
BIBLIOGRAPHIE ET WEBOGRAPHIE
GLOSSAIRE
ANNEXES
TABLE DES MATIÈRES

<div style="page-break-after: always"></div>

<!-- ===================== SIGLES ===================== -->

# LISTE DES SIGLES ET ABRÉVIATIONS

| Sigle | Signification |
|---|---|
| API | Application Programming Interface (interface de programmation) |
| CIF | Contrainte d'Intégrité Fonctionnelle |
| CRUD | Create, Read, Update, Delete (créer, lire, modifier, supprimer) |
| CSS | Cascading Style Sheets |
| CSV | Comma-Separated Values (fichier tableur) |
| DD | Dictionnaire des Données |
| DF | Dépendance Fonctionnelle |
| FCFA | Franc de la Communauté Financière Africaine |
| GDF | Graphe des Dépendances Fonctionnelles |
| GPS | Global Positioning System |
| HTML | HyperText Markup Language |
| HTTP(S) | HyperText Transfer Protocol (Secure) |
| JSON | JavaScript Object Notation |
| MCC | Modèle Conceptuel de la Communication (diagramme des flux) |
| MCD | Modèle Conceptuel des Données |
| MCT | Modèle Conceptuel des Traitements |
| MERISE | Méthode d'Étude et de Réalisation Informatique pour les Systèmes d'Entreprise |
| MLD-R | Modèle Logique des Données Relationnel |
| MOT | Modèle Organisationnel des Traitements |
| MPD | Modèle Physique des Données |
| OSRM | Open Source Routing Machine |
| OTP | One-Time Password (code à usage unique) |
| PIN | Personal Identification Number (code personnel) |
| PWA | Progressive Web App (application web installable) |
| RG | Règle de Gestion |
| SAT | Schéma d'Accès Théorique |
| SGBD | Système de Gestion de Bases de Données |
| SI | Système d'Information |
| SMS | Short Message Service |
| SQL | Structured Query Language |
| SSE | Server-Sent Events (événements envoyés par le serveur) |
| UTC | Temps universel coordonné |
| VPS | Virtual Private Server (serveur privé virtuel) |

<div style="page-break-after: always"></div>

<!-- ===================== FIGURES ===================== -->

# LISTE DES FIGURES

| N° | Titre | Chapitre |
|---|---|---|
| Figure 1 | Organigramme de la structure d'accueil | 1 |
| Figure 2 | Diagramme de Gantt du projet | 2 |
| Figure 3 | Circuit actuel d'une course en taxi-moto | 3 |
| Figure 4 | Cycle d'abstraction de la méthode MERISE | 4 |
| Figure 5 | Graphe des dépendances fonctionnelles (GDF) | 4 |
| Figure 6 | Modèle Conceptuel des Données (MCD) | 4 |
| Figure 7 | Diagramme de contexte | 5 |
| Figure 8 | Diagramme des flux (MCC) | 5 |
| Figure 9 | MCT — Gestion des courses | 5 |
| Figure 10 | MCT — Gestion des chauffeurs et des abonnements | 5 |
| Figure 11 | MCT — Sécurité et relation client | 5 |
| Figure 12 | MOT — Commande et déroulement d'une course | 5 |
| Figure 13 | MOT — Inscription, validation et abonnement d'un chauffeur | 5 |
| Figure 14 | Architecture technique de SURPLACE | 6 |
| Figure 15 à 32 | Captures d'écran de l'application | 7 |

# LISTE DES TABLEAUX

| N° | Titre | Chapitre |
|---|---|---|
| Tableau 1 | Fiche signalétique de la structure d'accueil | 1 |
| Tableau 2 | Planning prévisionnel du projet | 2 |
| Tableau 3 | Critique de l'existant | 3 |
| Tableau 4 | Comparaison des solutions envisagées | 3 |
| Tableau 5 | Règles de gestion | 4 |
| Tableau 6 | Dictionnaire des données brut | 4 |
| Tableau 7 | Dictionnaire des données épuré | 4 |
| Tableau 8 | Dépendances fonctionnelles | 4 |
| Tableau 9 | Entités du MCD | 4 |
| Tableau 10 | Associations et cardinalités du MCD | 4 |
| Tableau 11 | Correspondance MLD-R / tables physiques | 4 |
| Tableau 12 | Acteurs et flux | 5 |
| Tableau 13 | Événements, opérations et résultats du MCT | 5 |
| Tableau 14 à 16 | Tableaux du MOT | 5 |
| Tableau 17 | Matrice des accès (opérations × entités) | 5 |
| Tableau 18 | Outils et technologies | 6 |
| Tableau 19 | Résultats des tests automatiques | 8 |
| Tableau 20 | Coût estimatif du projet | 8 |
| Tableau 21 | Difficultés rencontrées et solutions | 8 |
