# AGENTS.md

Instructions pour les agents qui travaillent sur Eat Planner.

## Projet

Eat Planner est une application full-stack de gestion restaurant.

- Frontend: Nuxt 4, Vue 3, Pinia, Nuxt UI, Tailwind CSS.
- Backend: Node.js, Express, TypeScript, Zod.
- Base de donnees: MongoDB avec Mongoose.
- Auth: JWT, Argon2, 2FA TOTP.
- Emails locaux: Mailpit.

Le produit est un outil interne pour manager de restaurant: ingredients, fournisseurs, plats, ventes, charges, previsions, commandes, paiement par virement trace et messagerie fournisseur.

## Structure

```text
backend/              API Express TypeScript
backend/src/models/   Modeles Mongoose
backend/src/routes/   Routes API
backend/src/schemas/  Schemas Zod
frontend/             Application Nuxt
frontend/app/pages/   Pages applicatives
frontend/app/stores/  Stores Pinia
frontend/server/api/  Proxys API Nuxt vers le backend
```

## Regles de travail

- Ne jamais utiliser `git reset --hard` ou revert des changements sans demande explicite.
- Le worktree peut deja contenir des modifications utilisateur: les lire et travailler avec.
- Faire des changements cibles, sans refonte inutile.
- Garder le code en ASCII sauf si le fichier utilise deja clairement des caracteres speciaux.
- Utiliser `rg` pour chercher dans le repo.
- Utiliser `apply_patch` pour les modifications manuelles de fichiers.
- Ne pas committer sans demande explicite.

## Donnees et securite

- Les donnees metier ne doivent pas etre partagees entre utilisateurs.
- Toute requete backend sur ingredients, plats, charges, ventes, fournisseurs, previsions, commandes et messages doit respecter le scope du proprietaire connecte.
- Ne pas contourner les middlewares d'authentification existants.
- Valider les payloads backend avec Zod quand une route accepte du body.
- Ne jamais logger de secrets, tokens, IBAN complets ou mots de passe.
- Pour les paiements, l'application trace un virement declare par l'utilisateur. Elle ne doit pas pretendre executer un vrai transfert bancaire sans integration bancaire reelle.

## Frontend

- Preferer les composants et stores existants avant d'ajouter une nouvelle abstraction.
- Les pages doivent afficher un etat vide clair quand une liste vaut zero.
- Eviter les chargements infinis: toujours remettre `loading` ou `pending` a `false` dans un `finally`.
- Pour plusieurs appels de chargement independants, preferer `Promise.allSettled` si la page peut afficher un resultat partiel.
- Garder l'interface simple, professionnelle et lisible pour une soutenance.
- Eviter le texte explicatif inutile dans les pages: privilegier les titres courts, stats utiles, tables et actions.

## Backend

- Ajouter les routes dans `backend/src/routes`.
- Ajouter ou modifier les schemas de validation dans `backend/src/schemas`.
- Ajouter ou modifier les modeles dans `backend/src/models`.
- Garder les erreurs API explicites et compatibles avec le frontend.
- Les emails fournisseur doivent passer par le service email existant et rester testables avec Mailpit.

## Commandes utiles

Installation sans Make:

```bash
npm install
cd backend && npm install
cd ../frontend && npm install
```

Lancement Docker app + monitoring:

```bash
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d --build
```

Lancement app seule:

```bash
docker compose up -d --build
```

Frontend local:

```bash
cd frontend
npm run dev
```

Backend local:

```bash
cd backend
npm run dev
```

Checks:

```bash
git diff --check
cd frontend && npm run typecheck
cd frontend && npm run lint
cd backend && npm run build
```

Si `npm run typecheck` echoue sur `@sentry/nuxt/module`, verifier que les dependances frontend sont bien installees avec `cd frontend && npm install`.

## URLs locales

- Frontend: http://localhost:3001
- Backend: http://localhost:3000
- Mailpit: http://localhost:8025
- GlitchTip: http://localhost:8000
- Umami: http://localhost:3002
