# ---- Build stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Installer dépendances (inclut devDependencies nécessaires au build)
COPY package*.json ./
RUN npm ci --include=dev

# Copier le reste du projet
COPY . .

# Build Next.js (standalone mode recommandé)
RUN npm run build

# ---- Run stage ----
FROM node:20-alpine AS runner
WORKDIR /app

# Variables pour la prod
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copier uniquement ce qui est nécessaire
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Port d’écoute
EXPOSE 3000

# Lancement
CMD ["node", "server.js"]
