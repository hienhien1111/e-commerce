FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json ./

# ============================================================
# Development Stage
# ============================================================
FROM base AS development
RUN npm ci
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ============================================================
# Builder Stage
# ============================================================
FROM base AS builder
RUN npm ci
COPY . .
RUN npm run build

# ============================================================
# Production Stage
# ============================================================
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
