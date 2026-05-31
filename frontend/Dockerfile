FROM node:20-alpine

WORKDIR /app

# Enable pnpm
RUN corepack enable pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy app files
COPY . .

# Expose port
EXPOSE 3001

# Start development server
CMD ["pnpm", "dev"]
