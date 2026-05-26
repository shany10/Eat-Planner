# Eat Planner

Application full-stack de gestion restaurant pour piloter les ingredients, les fournisseurs, le stock, les previsions, les ventes, les charges et les commandes fournisseurs.

Le projet est pense comme un outil de gestion interne pour manager de restaurant, pas comme une boutique e-commerce grand public.

## Fonctionnalites

- Dashboard manager avec indicateurs business, actions rapides et suivi des achats.
- Gestion des ingredients avec categorie, unite, prix achat, stock actuel, seuil minimum, consommation moyenne et fournisseur associe.
- Gestion des fournisseurs avec types de produits, delai de livraison, frais, minimum de commande et contact.
- Gestion des plats avec recettes, cout matiere, charges et prix conseille.
- Gestion des ventes avec saisie manuelle et import CSV.
- Gestion des charges fixes et variables.
- Previsions de production avec explication des donnees, besoins matieres et corrections manager.
- Panier d'achat fournisseur professionnel avec quantites recommandees, totaux HT/TVA/TTC et validation.
- Paiement fictif uniquement, sans connexion bancaire et sans stockage de vraies donnees de carte.
- Confirmation et historique des commandes fournisseurs.
- Score de gestion, niveaux et badges pour gamifier l'approvisionnement sans effet jeu video enfantin.
- Authentification, roles admin/manager, securite 2FA et panel admin.

## Stack technique

| Couche | Technologies |
| --- | --- |
| Frontend | Nuxt 4, Vue 3, Pinia, Nuxt UI, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Zod |
| Base de donnees | MongoDB, Mongoose |
| Auth | JWT, Argon2, TOTP 2FA |
| Infra locale | Docker Compose |

## Structure du projet

```text
.
+-- backend/                  # API Express TypeScript
|   +-- src/models/            # Modeles Mongoose
|   +-- src/routes/            # Routes API
|   +-- src/schemas/           # Validations Zod
|   +-- seeders/               # Donnees de demo
+-- frontend/                 # Application Nuxt
|   +-- app/components/        # Composants UI
|   +-- app/pages/             # Pages applicatives
|   +-- app/stores/            # Stores Pinia
|   +-- server/api/            # Proxy API Nuxt vers backend
+-- docker-compose.yml         # Stack locale
+-- docker-compose.prod.yml    # Stack production
```

## Prerequis

- Docker Desktop
- Node.js 22 si lancement hors Docker
- npm

## Installation rapide avec Docker

1. Creer le fichier d'environnement :

```bash
cp .env.example .env
```

2. Construire et lancer les services :

```bash
docker compose up -d --build
```

3. Ouvrir l'application :

- Frontend : http://localhost:3001
- Backend : http://localhost:3000
- MongoDB : localhost:27017

4. Verifier les conteneurs :

```bash
docker compose ps
```

## Donnees de demo

Le projet contient un seed realiste pour une application restaurant :

- 12 fournisseurs professionnels
- 33 ingredients realistes
- categories, prix, unites, stocks, seuils, delais et minimums de commande

Pour reinitialiser toute la base avec les utilisateurs de demo :

```bash
docker compose exec backend npm run seed
```

Pour reinitialiser seulement les donnees metier achats, sans supprimer les utilisateurs :

```bash
docker compose exec backend npm run seed:business
```

Comptes crees par le seed complet :

| Role | Email | Mot de passe |
| --- | --- | --- |
| Admin | admin@eatplanner.local | Admin123! |
| Manager | jean.manager@eatplanner.local | Manager123! |
| Manager | camille.manager@eatplanner.local | Manager123! |

## Commandes utiles

### Docker

```bash
docker compose up -d --build
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
docker compose down
```

### Backend

```bash
cd backend
npm run dev
npm run build
npm run seed
npm run seed:business
```

### Frontend

```bash
cd frontend
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Variables d'environnement principales

Le fichier `.env.example` fournit les valeurs attendues :

- `MONGODB_URI` : URL MongoDB utilisee par le backend.
- `JWT_SECRET` : secret JWT.
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` : compte admin du seed.
- `GOOGLE_CLIENT_ID` / `NUXT_PUBLIC_GOOGLE_CLIENT_ID` : OAuth Google.
- `NUXT_BACKEND_BASE_URL` : URL backend utilisee par le frontend Nuxt.
- `NITRO_HOST` / `NITRO_PORT` : host et port du serveur Nuxt.
- `TOTP_ENCRYPTION_KEY` : cle de chiffrement 2FA.
- `FRONTEND_BASE_URL` : URL publique du frontend.
- `MAIL_*` : configuration SMTP pour la reinitialisation de mot de passe.

## Module achat fournisseur

Le parcours achat suit les etapes suivantes :

1. Prevision des besoins.
2. Selection des ingredients.
3. Panier fournisseur.
4. Validation de commande.
5. Paiement fictif.
6. Confirmation.
7. Historique des achats.

Chaque ligne de panier affiche le nom de l'ingredient, la categorie, le fournisseur, l'unite, le prix unitaire, la quantite commandee, le stock actuel, le seuil minimum, la quantite recommandee et le total.

Le paiement reste volontairement fictif. Aucune vraie donnee bancaire ne doit etre saisie, envoyee a un prestataire ou stockee.

## Verification avant rendu

Commandes recommandees avant de presenter le projet :

```bash
cd backend
npm run build
```

```bash
cd frontend
npm run lint
npm run typecheck
npm run build
```

Puis :

```bash
docker compose up -d --build
docker compose ps
```

## Notes

- Le projet utilise MongoDB, donc les donnees sont stockees en NoSQL.
- Les donnees de demo sont adaptees a un restaurant et remplacent les anciennes donnees de test.
- Les commandes fournisseurs, paiements fictifs, badges et historiques sont des fonctionnalites applicatives internes.
