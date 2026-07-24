FROM oven/bun:1.3.4 AS base

# Install global dependencies
RUN bun install -g @nestjs/cli typescript ts-node

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json bun.lock ./

# Copy prisma schema BEFORE bun install
COPY prisma ./prisma
# Use generate-only config (no DATABASE_URL needed at build time)
COPY prisma.generate.config.ts ./prisma.config.ts

# ============================================================================
# Development Stage
# ============================================================================
FROM base AS development

# Install runtime tools used by health checks and Nest watch mode. Nest CLI
# relies on `ps` to stop its child process before a hot-reload restart.
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates procps && rm -rf /var/lib/apt/lists/*

# Install all dependencies (skip postinstall to avoid DATABASE_URL requirement at build time)
RUN bun install --frozen-lockfile --ignore-scripts

# Generate Prisma client explicitly (no DATABASE_URL needed with generate config)
RUN bunx prisma generate

# Copy source code (will be overridden by volumes in docker-compose)
COPY . .

# Copy entrypoint
COPY docker-entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Expose API port
EXPOSE 3002

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# Development command with hot reload
CMD ["bun", "run", "start:dev"]

# ============================================================================
# Builder Stage (for production)
# ============================================================================
FROM base AS builder

# Install all dependencies (skip postinstall to avoid DATABASE_URL requirement at build time)
RUN bun install --frozen-lockfile --ignore-scripts

# Generate Prisma client explicitly
RUN bunx prisma generate

# Copy source code
COPY . .

# Build the application
RUN bun run build

# ==========================================================================
# Release Stage — one-off migration and seed job. This intentionally carries
# Prisma CLI and source code; the production API image below stays lean.
# ==========================================================================
FROM base AS release

RUN bun install --frozen-lockfile --ignore-scripts

COPY . .
RUN bunx prisma generate

COPY docker-release-entrypoint.sh /usr/local/bin/release-entrypoint.sh
RUN chmod +x /usr/local/bin/release-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/release-entrypoint.sh"]

# ============================================================================
# Production Stage
# ============================================================================
FROM oven/bun:1.3.4 AS production

WORKDIR /usr/src/app

# Healthcheck dependency
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./

# Copy Prisma schema and the generate-only config so image builds do not
# require a runtime DATABASE_URL.
COPY prisma ./prisma
COPY prisma.generate.config.ts ./prisma.config.ts

# Install production dependencies only (skip scripts to avoid prepare/husky)
RUN bun install --frozen-lockfile --production --ignore-scripts

# Generate the production Prisma client without loading runtime secrets.
RUN bunx prisma generate

# Copy built application from builder
COPY --from=builder /usr/src/app/dist ./dist

# Copy necessary configuration files
COPY --from=builder /usr/src/app/tsconfig.json ./
COPY --from=builder /usr/src/app/nest-cli.json ./

RUN chown -R bun:bun /usr/src/app

USER bun

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3002/api/health || exit 1

# Production command
CMD ["bun", "run", "start:prod"]
