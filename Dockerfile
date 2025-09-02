# Utilise une image Node officielle
FROM node:20-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package.json package-lock.json* ./

# Installer les dépendances
RUN npm install --production

# Copier le reste du code
COPY . .

# Construire l'app Next.js
RUN npm run build

# Exposer le port Next.js
EXPOSE 3000

# Démarrer l'app
CMD ["npm", "start"]
