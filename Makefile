COMPOSE := docker compose
COMPOSE_FULL := docker compose -f docker-compose.yml -f docker-compose.monitoring.yml

.DEFAULT_GOAL := help
.PHONY: help setup env install up up-watch up-app up-app-watch down restart build logs logs-backend \
        logs-frontend ps seed seed-business shell-backend shell-mongo \
        lint typecheck check clean

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## --- Mise en place ---

setup: env install ## Prepare le projet (env + dependances Node)

env: ## Cree le .env depuis .env.example s'il n'existe pas
	@if [ -f .env ]; then \
		echo ".env deja present, rien a faire."; \
	else \
		cp .env.example .env; \
		echo ".env cree depuis .env.example. Pensez a renseigner les valeurs."; \
	fi

install: 
	npm install
	cd backend && npm install
	cd frontend && npm install

## --- Docker ---

up: ## Lance app + monitoring (GlitchTip + Umami)
	$(COMPOSE_FULL) up -d --build

up-watch: ## Lance app + monitoring avec hot reload Docker Compose Watch
	$(COMPOSE_FULL) up --build --watch

up-app: ## Lance uniquement la stack applicative (sans monitoring)
	$(COMPOSE) up -d --build

up-app-watch: ## Lance uniquement l'app avec hot reload Docker Compose Watch
	$(COMPOSE) up --build --watch

down: ## Arrete et supprime les conteneurs
	$(COMPOSE_FULL) down

restart: down up ## Redemarre toute la stack

build: ## (Re)construit les images sans demarrer
	$(COMPOSE_FULL) build

ps: ## Liste l'etat des conteneurs
	$(COMPOSE_FULL) ps

logs: ## Suit les logs de tous les services
	$(COMPOSE_FULL) logs -f

logs-backend: ## Suit les logs du backend
	$(COMPOSE) logs -f backend

logs-frontend: ## Suit les logs du frontend
	$(COMPOSE) logs -f frontend

## --- Donnees ---

seed: ## Reinitialise toute la base avec les comptes de demo
	$(COMPOSE) exec backend npm run seed

seed-business: ## Reinitialise seulement les donnees metier (sans les utilisateurs)
	$(COMPOSE) exec backend npm run seed:business

## --- Acces conteneurs ---

shell-backend: ## Ouvre un shell dans le conteneur backend
	$(COMPOSE) exec backend sh

shell-mongo: ## Ouvre le client mongosh
	$(COMPOSE) exec mongo mongosh

## --- Qualite ---

lint: ## Lint le frontend
	cd frontend && npm run lint

typecheck: ## Verifie les types backend et frontend
	cd backend && npm run build
	cd frontend && npm run typecheck

check: lint typecheck ## Lint + typecheck (a lancer avant un rendu)

## --- Nettoyage ---

clean: ## Arrete la stack et supprime les volumes (DONNEES PERDUES)
	$(COMPOSE_FULL) down -v
