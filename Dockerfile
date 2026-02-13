# Prisma 7 requires Node 20.19+, 22.12+, or 24+
FROM node:22.12-alpine AS base

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy app and generate Prisma client
COPY . .
RUN npx prisma generate
RUN npx prisma migrate deploy

# Build Next.js
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

# Railway sets PORT at runtime
CMD ["npm", "run", "start"]
