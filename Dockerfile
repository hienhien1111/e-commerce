FROM oven/bun:1.3.4 AS base

# Install global dependencies
RUN bun install -g @nestjs/cli typescript ts-node

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package.json bun.lock ./

# ============================================================================
# Development Stage
# ============================================================================
FROM base AS development

# Install curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Install all dependencies (including devDependencies)
RUN bun install --frozen-lockfile

# Copy source code (will be overridden by volumes in docker-compose)
COPY . .

# Expose port (will be overridden by docker-compose)
EXPOSE 3001

# Development command - run directly without shell scripts
CMD ["bun", "run", "start:dev"]

# ============================================================================
# Build Stage (for production)
# ============================================================================
FROM base AS builder

# Install all dependencies (needed for build)
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN bun run build

# ============================================================================
# Production Stage
# ============================================================================
FROM oven/bun:1.3.4 AS production

# Install only production dependencies
WORKDIR /usr/src/app

# Healthcheck dependency
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json bun.lock ./

# Install production dependencies only (skip scripts to avoid prepare script requiring devDependencies)
RUN bun install --frozen-lockfile --production --ignore-scripts

# Copy built application from builder
COPY --from=builder /usr/src/app/dist ./dist

# Copy necessary configuration files
COPY --from=builder /usr/src/app/tsconfig.json ./
COPY --from=builder /usr/src/app/nest-cli.json ./

RUN chown -R bun:bun /usr/src/app

USER bun

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Production command
CMD ["bun", "run", "start:prod"]
