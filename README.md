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

## Prise en main (nouvelle machine)

A faire quand on recupere le projet pour la premiere fois. Un `Makefile` fournit des raccourcis (voir `make help`) ; les commandes Docker completes sont donnees en regard.

1. Recuperer le code :

```bash
git clone <url-du-repo>
cd Eat-Planner
```

2. Mettre en place le fichier d'environnement.

Le fichier `.env` n'est pas versionne (il est dans `.gitignore`). Deux cas :

- Si le responsable du projet vous a fourni un `.env` (avec les identifiants Sentry/GlitchTip, Umami, Google, SMTP deja remplis), placez-le a la racine du projet, a cote de `.env.example`. Rien d'autre a generer.
- Sinon, creez-le depuis le modele puis completez les valeurs vous-meme :

```bash
make env        # equivaut a : cp .env.example .env
```

3. Installer les dependances Node (necessaire pour l'IDE, le typage et les commandes locales) :

```bash
make install    # npm install a la racine, dans backend/ et frontend/
```

> `make setup` enchaine les etapes 2 et 3 en une seule commande.

4. Lancer le monitoring puis l'application.

Les deux stacks doivent etre lancees ensemble pour partager le meme reseau Docker : sinon le backend ne peut pas joindre `glitchtip-web` et le reporting d'erreurs echoue. La cible `make up` s'en charge.

```bash
make up         # docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d --build
```

5. Ouvrir l'application :

- Frontend : http://localhost:3001
- Backend : http://localhost:3000
- MongoDB : localhost:27017
- Mailpit (emails locaux) : http://localhost:8025
- GlitchTip (erreurs) : http://localhost:8000
- Umami (analytics) : http://localhost:3002

6. Verifier les conteneurs :

```bash
make ps         # docker compose ... ps
```

> Le monitoring est optionnel pour faire tourner l'app. Si `SENTRY_DSN` et les DSN frontend restent vides dans `.env`, les SDK se desactivent proprement et l'application fonctionne sans reporting. Dans ce cas, lancez seulement la stack applicative avec `make up-app`.

## Raccourcis Make

Un `Makefile` regroupe les commandes courantes. `make` ou `make help` affiche la liste complete.

| Commande | Description |
| --- | --- |
| `make setup` | Cree le `.env` et installe les dependances Node |
| `make up` | Lance app + monitoring (GlitchTip + Umami) |
| `make up-app` | Lance uniquement la stack applicative |
| `make down` | Arrete et supprime les conteneurs |
| `make restart` | Redemarre toute la stack |
| `make logs` | Suit les logs de tous les services |
| `make ps` | Etat des conteneurs |
| `make seed` | Reinitialise la base avec les comptes de demo |
| `make seed-business` | Reinitialise seulement les donnees metier |
| `make check` | Lint + typecheck avant un rendu |
| `make clean` | Arrete la stack et supprime les volumes (donnees perdues) |

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
- `MAIL_*` pointe par defaut vers Mailpit en local. Les emails fournisseurs et reset mot de passe sont visibles sur http://localhost:8025.
- `SENTRY_DSN` / `SENTRY_SERVER_DSN` / `NUXT_PUBLIC_SENTRY_DSN` : DSN GlitchTip (compatible Sentry) pour le reporting d'erreurs backend et frontend. Laisser vide pour desactiver.
- `NUXT_PUBLIC_UMAMI_SRC` / `NUXT_PUBLIC_UMAMI_WEBSITE_ID` : analytics web Umami. Laisser l'id vide pour desactiver.
- `GLITCHTIP_*` / `UMAMI_*` : configuration des conteneurs de monitoring (voir `docker-compose.monitoring.yml`).

Le monitoring repose sur GlitchTip et Umami auto-heberges, pas sur un service SaaS externe. Les DSN GlitchTip et l'id de site Umami sont generes dans leurs interfaces respectives (http://localhost:8000 et http://localhost:3002) lors de la creation des projets. Si le responsable vous transmet un `.env` complet, ces valeurs sont deja renseignees et il n'y a rien a regenerer.

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
