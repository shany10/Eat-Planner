FROM node:20-alpine

# Installation de pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copie des fichiers de dépendances
COPY package.json pnpm-lock.yaml* ./

# Installation des dépendances (version Linux)
RUN pnpm install

# Copie du reste du code
COPY . .

EXPOSE 3001

CMD ["pnpm", "run", "dev"]