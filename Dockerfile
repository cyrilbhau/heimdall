# Prisma 7 requires Node 20.19+, 22.12+, or 24+
FROM node:22.12-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy app and generate Prisma client
COPY . .
RUN npx prisma generate

# Build Next.js (no DB needed at build time)
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Run migrations at runtime when DATABASE_URL is set, then start the app
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
