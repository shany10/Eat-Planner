Cahier des charges fonctionnel
Application de gestion, de rentabilité et de prévision pour la restauration
1. Contexte du projet

Les établissements de restauration doivent gérer quotidiennement plusieurs enjeux importants : maîtrise des coûts, fixation de prix de vente rentables, anticipation de la demande, limitation du gaspillage alimentaire et optimisation des achats de matières premières.

Une mauvaise estimation des quantités à produire peut entraîner soit une surproduction, générant des pertes alimentaires et financières, soit une sous-production, entraînant une perte de chiffre d’affaires et une insatisfaction client.

Le projet consiste à concevoir une application web destinée aux restaurateurs afin de les aider à piloter leur activité de manière plus rentable, plus précise et plus durable.

2. Objectifs du projet

L’application devra permettre aux restaurateurs de :

calculer le coût réel de revient de chaque plat ;
déterminer un prix de vente conseillé selon les coûts, les charges et la marge souhaitée ;
analyser la rentabilité des plats proposés ;
prévoir les quantités de plats à préparer chaque jour ;
réduire les pertes liées au gaspillage alimentaire ;
anticiper les besoins en matières premières ;
améliorer la prise de décision commerciale, financière et opérationnelle.
3. Périmètre fonctionnel

L’application sera composée de deux modules principaux :

Module 1 : Rentabilité et calcul des prix de vente

Ce module permettra de gérer les ingrédients, les recettes, les charges du restaurant et les marges afin de calculer automatiquement un prix de vente conseillé.

Module 2 : Prévision des ventes et de la production

Ce module permettra d’exploiter l’historique des ventes et certains facteurs externes afin d’estimer les quantités à produire et les besoins en matières premières.

4. Fonctionnalités détaillées
4.1 Module 1 — Calcul de rentabilité et prix de vente
4.1.1 Gestion des ingrédients

L’application devra permettre à l’utilisateur de créer, modifier, consulter et supprimer des ingrédients.

Pour chaque ingrédient, les informations suivantes devront être renseignées :

Champ	Description
Nom de l’ingrédient	Exemple : farine, tomate, poulet
Unité de mesure	kg, g, litre, ml, pièce, etc.
Prix d’achat unitaire	Prix payé pour l’unité de référence
Fournisseur	Information optionnelle
Date de mise à jour du prix	Permet de suivre l’évolution des coûts
Statut	Actif ou inactif
Règles de gestion
Le nom de l’ingrédient est obligatoire.
L’unité de mesure est obligatoire.
Le prix d’achat unitaire doit être supérieur ou égal à zéro.
Un ingrédient utilisé dans une recette ne doit pas être supprimé définitivement sans confirmation.
En cas de suppression, l’ingrédient peut être désactivé plutôt que supprimé afin de conserver l’historique.
4.1.2 Gestion des recettes et des plats

L’application devra permettre de créer et gérer les plats proposés par le restaurant.

Pour chaque plat, les informations suivantes devront être renseignées :

Champ	Description
Nom du plat	Exemple : pizza margarita, burger maison
Catégorie	Entrée, plat, dessert, boisson, menu, etc.
Liste des ingrédients	Ingrédients nécessaires à la préparation
Quantité par ingrédient	Quantité utilisée pour une portion
Nombre de portions	Nombre de portions produites par recette
Coût matière calculé	Somme des coûts des ingrédients
Marge souhaitée	Marge par défaut ou spécifique au plat
Prix de vente conseillé	Calculé automatiquement
Prix de vente réel	Prix choisi par le restaurateur
Statut	Actif ou inactif
Règles de gestion
Un plat doit contenir au moins un ingrédient.
Chaque ingrédient associé à un plat doit avoir une quantité définie.
Le coût matière du plat est calculé automatiquement à partir des ingrédients.
Le prix de vente conseillé doit être recalculé lorsqu’un prix d’ingrédient, une charge ou une marge est modifié.
Un plat inactif ne doit plus apparaître dans les prévisions de production, sauf demande spécifique de l’utilisateur.
4.1.3 Gestion des charges fixes et variables

L’application devra permettre de paramétrer les charges globales du restaurant.

Les charges pourront inclure :

Type de charge	Exemple
Salaires	Personnel de cuisine, service, administration
Énergie	Électricité, eau, gaz
Local	Loyer, charges locatives
Matériel	Amortissement, maintenance
Assurances	Assurance professionnelle
Abonnements	Logiciels, plateformes, téléphonie
Autres charges	Toute autre dépense régulière

Chaque charge devra contenir :

Champ	Description
Nom de la charge	Exemple : loyer mensuel
Type de charge	Fixe ou variable
Montant	Montant de la charge
Période	Jour, semaine, mois, année
Date de début	Début de validité
Date de fin	Optionnelle
Statut	Active ou inactive
Règles de gestion
Le montant d’une charge doit être supérieur ou égal à zéro.
Une charge peut être répartie sur une période définie : jour, semaine, mois ou année.
Les charges doivent pouvoir être intégrées au calcul du prix de vente.
Les charges inactives ne doivent pas être prises en compte dans les nouveaux calculs.
4.1.4 Gestion de la marge

L’application devra permettre de définir une marge souhaitée.

Deux niveaux de marge pourront être gérés :

une marge globale par défaut pour tous les plats ;
une marge spécifique par plat.
Point important à clarifier

Le terme “marge” peut désigner deux méthodes différentes :

Taux de marge sur coût
Exemple : coût de revient 10 €, marge 30 %, prix = 13 €.
Taux de marque sur prix de vente
Exemple : coût de revient 10 €, marge souhaitée 30 % du prix de vente, prix = 14,29 €.

Pour éviter toute erreur de calcul, l’application devra définir clairement la méthode utilisée. Pour une gestion commerciale, le taux de marque sur prix de vente est souvent plus adapté.

4.1.5 Calcul du prix de vente conseillé

Le prix de vente conseillé devra être calculé automatiquement à partir des éléments suivants :

coût matière du plat ;
quote-part des charges ;
marge souhaitée ;
éventuellement TVA, commission de plateforme ou frais de livraison si ces éléments sont ajoutés au périmètre.
Exemple de formule possible

Si la marge est calculée sur le prix de vente :

Prix de vente conseillé = Coût total / (1 - Taux de marge souhaité)

Avec :

Coût total = Coût matière + Quote-part des charges
Affichage attendu

L’application devra afficher le détail du calcul afin que l’utilisateur comprenne la composition du prix :

Élément	Montant
Coût matière	X €
Charges affectées	X €
Coût total	X €
Marge souhaitée	X %
Prix conseillé	X €
Prix réel	X €
Écart entre prix conseillé et prix réel	X € / X %
4.2 Module 2 — Prévision des ventes et de la production
4.2.1 Historique des ventes

L’application devra permettre d’enregistrer et consulter les ventes passées.

Chaque vente devra contenir :

Champ	Description
Date de vente	Date de la transaction ou de la journée
Plat vendu	Plat concerné
Quantité vendue	Nombre d’unités vendues
Prix de vente	Prix appliqué
Chiffre d’affaires	Calculé automatiquement
Source	Saisie manuelle, import CSV ou logiciel de caisse
Fonctionnalités attendues
Saisie manuelle des ventes.
Import des ventes depuis un fichier CSV.
Possibilité d’intégration future avec un logiciel de caisse.
Consultation des ventes par jour, semaine, mois ou période personnalisée.
Analyse des ventes par plat.
4.2.2 Analyse des facteurs externes

L’algorithme de prévision devra pouvoir prendre en compte plusieurs facteurs externes susceptibles d’influencer la demande.

Facteurs possibles :

Facteur	Exemple
Historique des ventes	Quantités vendues les jours précédents
Jour de la semaine	Lundi, vendredi, samedi
Saison	Été, hiver, période touristique
Météo	Température, pluie, soleil
Jours fériés	14 juillet, Noël, etc.
Événements	Matchs, concerts, événements locaux
Promotions	Offre spéciale, menu du jour
Règles de gestion
Les données météo pourront être récupérées via une API externe.
Les événements pourront être saisis manuellement ou récupérés via une source externe si disponible.
L’utilisateur devra pouvoir corriger manuellement une prévision proposée par le système.
Les corrections manuelles pourront être conservées pour améliorer les prévisions futures.
4.2.3 Algorithme de prévision

L’application devra calculer une estimation du nombre de plats à préparer pour une date donnée.

L’estimation pourra s’appuyer sur :

les ventes historiques du même jour de la semaine ;
la moyenne des ventes sur une période donnée ;
les tendances récentes ;
les variations saisonnières ;
la météo ;
les événements spécifiques ;
les corrections manuelles de l’utilisateur.
Résultat attendu

Pour chaque jour, l’application devra proposer :

Information	Description
Plat	Plat concerné
Quantité prévue	Nombre estimé de plats à vendre
Quantité recommandée à produire	Quantité à préparer
Niveau de confiance	Faible, moyen ou élevé
Commentaire	Explication de la prévision
Correction utilisateur	Quantité modifiée manuellement
4.2.4 Recommandations de production

À partir des prévisions, l’application devra fournir des recommandations concrètes.

Fonctionnalités attendues :

suggestion des quantités à produire par plat ;
calcul automatique des besoins en ingrédients ;
alerte en cas de risque de surproduction ;
alerte en cas de risque de sous-production ;
affichage des ingrédients nécessaires pour la journée ;
comparaison entre production recommandée et ventes réelles.
Exemple

Si le système prévoit 30 burgers et que chaque burger nécessite 150 g de steak, l’application devra calculer automatiquement :

30 × 150 g = 4,5 kg de steak nécessaires
5. Utilisateurs et rôles
5.1 Administrateur

L’administrateur dispose des droits les plus élevés.

Il peut :

gérer les utilisateurs ;
configurer les paramètres globaux ;
gérer les charges ;
gérer les marges par défaut ;
accéder à toutes les données ;
modifier les paramètres de sécurité.
5.2 Gérant / Restaurateur

Le gérant utilise l’application pour piloter l’activité du restaurant.

Il peut :

gérer les ingrédients ;
gérer les plats et recettes ;
consulter les coûts et la rentabilité ;
consulter les prévisions ;
corriger les recommandations ;
suivre les ventes et les indicateurs financiers.
5.3 Employé

L’employé dispose d’un accès limité.

Il peut :

consulter les quantités à préparer ;
consulter les fiches de production ;
consulter certains plats ou recettes selon les droits accordés.
6. Entités principales du système

Les principales entités à prévoir sont :

Entité	Description
Utilisateur	Personne ayant accès à l’application
Rôle	Niveau d’autorisation de l’utilisateur
Restaurant	Établissement utilisant l’application
Ingrédient	Matière première utilisée dans les recettes
Fournisseur	Entreprise fournissant les ingrédients
Plat	Produit vendu au client
Recette	Composition détaillée d’un plat
Charge	Dépense fixe ou variable du restaurant
Marge	Paramètre de rentabilité
Vente	Historique des plats vendus
Prévision	Estimation des ventes futures
Recommandation de production	Quantités conseillées à préparer
Événement externe	Facteur pouvant influencer la demande
Donnée météo	Information météo utilisée dans la prévision
7. Règles métier principales
Règle 1 — Calcul du coût matière

Lorsqu’un plat est créé ou modifié, le système doit calculer son coût matière à partir des ingrédients associés.

Coût matière = Somme des quantités utilisées × prix unitaire des ingrédients
Règle 2 — Recalcul automatique du prix conseillé

Lorsqu’un ingrédient, une charge ou une marge est modifié, le système doit recalculer le prix de vente conseillé des plats concernés.

Règle 3 — Prévision de production

Chaque jour, le système doit pouvoir générer une prévision de production à partir de l’historique des ventes et des facteurs externes disponibles.

Règle 4 — Correction manuelle

L’utilisateur doit pouvoir modifier manuellement une prévision générée automatiquement.

Le système doit conserver :

la prévision initiale ;
la correction utilisateur ;
la date de correction ;
l’utilisateur ayant effectué la modification.
Règle 5 — Alertes de production

Le système doit générer une alerte lorsque :

la quantité prévue est très supérieure à la moyenne habituelle ;
la quantité prévue est très inférieure à la moyenne habituelle ;
les besoins en ingrédients dépassent les stocks disponibles, si la gestion des stocks est ajoutée ;
un plat n’est pas rentable selon les paramètres définis.
8. Exigences techniques
8.1 Application web

L’application devra être accessible depuis :

ordinateur ;
tablette ;
smartphone.

Elle devra disposer d’une interface responsive adaptée aux différents écrans.

8.2 Sécurité

L’application devra intégrer :

une authentification sécurisée ;
une gestion des rôles et permissions ;
un chiffrement des mots de passe ;
une protection des données financières ;
une journalisation des actions importantes.
8.3 Base de données

La base de données devra stocker :

les utilisateurs ;
les restaurants ;
les ingrédients ;
les plats ;
les recettes ;
les charges ;
les ventes ;
les prévisions ;
les paramètres de calcul.

Le choix entre une base SQL ou NoSQL devra être validé selon la structure finale des données. Une base relationnelle peut être pertinente pour gérer les recettes, ingrédients, ventes et relations entre entités.

8.4 API externes

L’application pourra utiliser des API externes pour :

récupérer la météo ;
récupérer des jours fériés ;
intégrer des événements locaux ;
se connecter à un logiciel de caisse ;
importer des données depuis des outils tiers.
9. Exigences non fonctionnelles
9.1 Ergonomie

L’interface devra être simple, claire et adaptée à des utilisateurs non techniques.

L’utilisateur devra pouvoir accéder rapidement aux informations essentielles :

rentabilité d’un plat ;
prix conseillé ;
quantités à produire ;
besoins en ingrédients ;
alertes importantes.
9.2 Performance

Le système devra fournir les calculs de coût et de prévision dans un délai raisonnable, même avec un historique de ventes important.

9.3 Fiabilité

Les calculs financiers doivent être cohérents, traçables et compréhensibles.

L’utilisateur devra pouvoir consulter le détail des calculs afin de vérifier les résultats.

9.4 Évolutivité

L’architecture devra permettre l’ajout futur de nouveaux modules :

gestion des stocks ;
application mobile ;
connexion caisse ;
tableaux de bord avancés ;
intelligence artificielle avancée.
10. Permissions attendues

Par défaut, les permissions suivantes devront être prévues :

Permission	Description
Créer un ingrédient	Autorise l’ajout d’un ingrédient
Consulter un ingrédient	Autorise la lecture des ingrédients
Modifier un ingrédient	Autorise la modification d’un ingrédient
Supprimer un ingrédient	Autorise la suppression ou désactivation
Créer un plat	Autorise l’ajout d’un plat
Modifier un plat	Autorise la modification d’une recette
Consulter la rentabilité	Autorise l’accès aux calculs financiers
Gérer les charges	Autorise la création et modification des charges
Gérer les ventes	Autorise la saisie ou l’import des ventes
Générer une prévision	Autorise la création de prévisions
Modifier une prévision	Autorise la correction manuelle
Consulter les recommandations	Autorise l’accès aux quantités à produire
Gérer les utilisateurs	Autorise la gestion des comptes et rôles
11. Livrables attendus

Les livrables du projet sont :

Cahier des charges fonctionnel validé.
Spécifications fonctionnelles détaillées.
Maquettes UI/UX.
Modèle de données.
Application web fonctionnelle.
Documentation utilisateur.
Documentation technique.
Jeux de tests fonctionnels.
Guide d’installation et de déploiement.
12. Évolutions possibles

L’application pourra évoluer avec les fonctionnalités suivantes :

intégration avec des logiciels de caisse ;
gestion des stocks en temps réel ;
suivi des dates de péremption ;
gestion des fournisseurs et commandes ;
tableaux de bord avancés ;
indicateurs de performance ;
intelligence artificielle pour améliorer les prévisions ;
application mobile dédiée ;
gestion multi-restaurants ;
analyse comparative entre plusieurs établissements ;
export comptable.
13. Points clarifiés avant développement

Pour une première version web mobile, l’application devra rester simple, performante et facilement utilisable par des restaurateurs non techniques. Les choix suivants sont donc retenus.

La marge sera calculée sur le prix de vente afin de proposer un prix conseillé cohérent avec les objectifs de rentabilité. La TVA sera prise en compte séparément afin d’afficher à la fois le prix hors taxe, le montant de la TVA et le prix TTC conseillé.

La gestion des stocks en temps réel ne sera pas intégrée dans la première version. L’application calculera uniquement les besoins prévisionnels en matières premières à partir des recettes et des quantités recommandées à produire.

Les ventes pourront être saisies manuellement ou importées depuis un fichier CSV. L’intégration avec un logiciel de caisse sera prévue comme évolution future.

La première version sera conçue pour gérer un seul restaurant par compte utilisateur. La gestion multi-restaurants pourra être ajoutée ultérieurement.

Les événements externes, tels que les matchs, fêtes locales ou événements exceptionnels, seront saisis manuellement par l’utilisateur. Une récupération automatique via API pourra être envisagée dans une version future.

Les fournisseurs seront gérés de manière simple, avec les informations principales comme le nom, le contact et les ingrédients associés. La gestion avancée des commandes fournisseurs sera prévue comme évolution possible.

La gestion des droits sera basée sur des rôles prédéfinis : Administrateur, Gérant et Employé. Les permissions personnalisables ne seront pas nécessaires dans la première version.

L’application devra permettre l’export des données au format CSV ou Excel. L’export PDF pourra être ajouté ultérieurement pour générer des rapports imprimables.

Enfin, l’application fonctionnera uniquement en ligne dans la première version. Le mode hors ligne ne sera pas prioritaire afin de limiter la complexité technique du projet.
14. Conclusion

Cette application a pour objectif d’aider les restaurateurs à mieux piloter leur activité en combinant calcul de rentabilité, gestion des coûts, prévision des ventes et optimisation de la production.

Elle permettra de prendre de meilleures décisions sur les prix de vente, les quantités à préparer et les achats de matières premières. À terme, elle pourra devenir un véritable outil d’aide à la décision pour améliorer la rentabilité, réduire le gaspillage alimentaire et optimiser la gestion quotidienne d’un établissement de restauration.