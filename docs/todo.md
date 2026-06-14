

Priorité 2

Ajouter le rôle Employé
Actuellement tu as surtout admin et manager. Le cahier demande aussi employé, avec accès limité aux quantités à préparer et fiches de production.

Améliorer les charges
Il manque :

type fixe / variable ;
période semaine / année ;
date de début ;
date de fin optionnelle.
Aujourd’hui c’est plus simple : catégorie + montant + daily/monthly.
Ajouter les facteurs externes simples
Pas besoin de météo API tout de suite. Pour ta V1, fais surtout :

événement manuel ;
promotion ;
jour spécial ;
commentaire d’impact sur la prévision.
Ajouter les filtres par période
Sur ventes, charges, dashboard et prévisions :

jour ;
semaine ;
mois ;
période personnalisée.
Ajouter export CSV / Excel
Le cahier demande export CSV ou Excel. À faire sur :

ventes ;
plats/rentabilité ;
prévisions ;
besoins matières.
Priorité 3

Historique des prix ingrédients
Tu as updated_at, mais pas un vrai historique de prix. Pour le cahier, ce serait mieux de garder les anciens prix d’achat par date.

Suppression douce / désactivation
Tu as déjà le champ active, mais il faut généraliser la logique : éviter les suppressions définitives quand il y a de l’historique.

Journalisation des actions importantes
Le cahier parle de journalisation. Il faudrait tracer :

création/modification/suppression ;
changement de rôle ;
désactivation utilisateur ;
correction de prévision.
Jeux de tests fonctionnels
C’est un gros manque : le backend a un script test placeholder. Il faudrait au minimum tester :
calcul coût matière ;
prix conseillé ;
ventes ;
prévisions ;
permissions admin/manager/employé.
Mon avis : pour une soutenance ou une V1 solide, ne pars pas tout de suite sur météo, IA avancée, caisse ou stock temps réel. Le plus important est de bétonner le cœur métier : prix réel + TVA + prévision corrigible + import CSV + rôle employé + données isolées par restaurant.





