# Changelog

## v2.2.0-phase5-complete — 2026-05-13

Production hardening across security, observability, architecture isolation,
and quality gates. All additions are non-breaking; deferred items kept.

### Added

#### Security (5A)
- `helmet@8.1.0` for HTTP security headers (CSP, X-Frame-Options, HSTS, etc.)
- `@nestjs/throttler@6.5.0` as global guard (default 100 req/60s/IP, env-tunable)
- Explicit CORS origin whitelist via `CORS_ORIGINS` env (comma-separated; `*` or empty allows all in dev)
- Extended `AppConfig` with `corsOrigins`, `throttleTtlMs`, `throttleLimit`

#### Env validation (5B)
- `zod@4.4.3` schema (`src/config/env.schema.ts`) validates `process.env` at boot
- Single source of truth for all required + optional env vars (coerced + typed)
- Fails fast with formatted error listing every missing/invalid field

#### Layer isolation (5C)
- ESLint `no-restricted-imports` rules:
  - `src/domain/**` blocks `@nestjs/*`, `@prisma/*`, `typeorm`, `class-validator`, `@/infrastructure/*`, `@/application/*`, `@/presentation/*`
  - `src/application/**` blocks `@prisma/*`, `@/infrastructure/*`, `@/presentation/*` (except `*.module.ts` composition root)
- Refactored 11 architectural violations the rule surfaced:
  - Removed unused domain exceptions extending NestJS HttpException
  - Removed `implements IEvent` from 3 domain events (marker only)
  - Moved `jwt-payload.type` from infra → application
  - Created `src/application/identity/types/{command-payloads,user-query.types,jwt-payload.type}.ts` (plain TS interfaces)
  - 4 command classes + UserRepositoryPort + GetUsersQuery now reference these instead of presentation DTOs

#### Observability (5D / 5F / 5G)
- `nestjs-pino@4.6.1` + `pino@10.3.1` for structured logging
  - JSON in prod, pino-pretty single-line in dev (colorized)
  - `x-request-id` header → log correlation (UUID fallback)
  - Redacts auth headers, cookies, password/token body fields
  - Custom log level by status code (5xx→error, 4xx→warn, else info)
- `@opentelemetry/sdk-node@0.217` + auto-instrumentations (HTTP, Prisma, Pino, pg, etc.)
  - `src/tracing.ts` initialized as first import in main.ts (require-time patching)
  - OTLP HTTP exporter when `OTEL_EXPORTER_OTLP_ENDPOINT` set; NOOP otherwise
  - Pino logs auto-receive `trace_id` / `span_id` for trace↔log correlation
  - Resource attributes: service.name, service.version, deployment.environment
  - Graceful shutdown on SIGTERM/SIGINT (flush spans)
- `@willsoto/nestjs-prometheus@6.1.0` + `prom-client@15.1.3` for metrics
  - `/metrics` endpoint in Prometheus exposition format
  - Default Node.js process metrics (heap, CPU, event loop, GC, FDs)
  - Seeded custom providers: `http_request_duration_seconds` histogram, `auth_login_attempts_total` counter

#### Coverage (5E)
- Jest `coverageThreshold.global` floor: branches 5, functions 5, lines 10, statements 10
- `collectCoverageFrom` excludes generated client, DTOs, modules, ports, events
- Conservative floor matches current 16% baseline; aspirational target 70% global, 90% domain (ratchet up over time)

#### Scalability (5H)
- `ioredis@5.10.1` + `RedisChallengeStore` implementing `ChallengeStorePort`
- Opt-in via `REDIS_URL` env; falls back to `InMemoryChallengeStore` when unset
- Required for multi-instance deployments (in-memory store cannot share challenges across pods)
- Redis TTL handles challenge expiry automatically

#### Health (5I)
- Replaced broken `TypeOrmHealthIndicator` (Phase 3 left it orphaned) with custom `PrismaHealthIndicator`
- Added opt-in `RedisHealthIndicator` (reports healthy & `configured: false` when REDIS_URL unset)
- Three endpoints split for k8s probes:
  - `GET /health` — full check (db + redis + dev api-docs ping)
  - `GET /health/live` — liveness only (no deps; for k8s livenessProbe)
  - `GET /health/ready` — readiness (db + redis; for k8s readinessProbe)

### Changed

- `main.ts`: `import './tracing'` is now the first line (OTel needs require-time patching)
- `app.useLogger(app.get(Logger))` replaces default NestJS console logger
- `cors: true` → `cors: false` + explicit `app.enableCors({ origin: whitelist })`
- `AppModule.providers`: added global `ThrottlerGuard` as `APP_GUARD`
- `AppModule.imports`: registered `LoggerModule`, `MetricsModule`, `PrismaModule` (already there)

### Deferred (Phase 5+ roadmap)

- AggregateRoot base class + Value Objects refactor (Email, Password, UserId)
- `@casl/prisma` migration (SQL-level filtering via `accessibleBy`)
- Transactional Outbox for domain events
- Rewrite Hygen module templates for Prisma
- Phase 3F migration baseline (requires Postgres running)

### Verification (all green)

- `bunx tsc --noEmit`: 0 errors
- `bun run lint`: 0 errors (new layer rules enforced)
- `bun run build`: success
- `bun run test`: 12 suites / 49 tests
- `bun run test:cov`: 16.6% statements > floor 10%
- `bunx prisma format && bunx prisma generate`: success

---

## v2.0.0-phase1-cleanup — 2026-05-12

**BREAKING CHANGES.** Boilerplate cleanup + ORM migration from TypeORM to Prisma 7.

### Added

- **Prisma 7.8.0** as the sole ORM, with `@prisma/adapter-pg` driver-adapter pattern
- `prisma/schema.prisma` with 5 models (User, Role, Permission, Session, WebAuthnCredential), 2 enums, 2 join tables
- `prisma.config.ts` (Prisma 7 new config file)
- `prisma/seed.ts` (replaces TypeORM seed; uses driver-adapter)
- `PrismaService` (NestJS injectable, no `$connect()` lifecycle — driver-adapter handles it)
- `@Global() PrismaModule` exporting `PrismaService`
- 5 new Prisma-backed repositories (`prisma-<name>.repository.ts`) implementing existing application-layer ports verbatim
- 5 Prisma-aware mappers (domain ↔ Prisma row)
- `package.json` scripts: `db:generate`, `db:migrate:dev`, `db:migrate:deploy`, `db:pull`, `db:studio`, `db:seed`, `postinstall: prisma generate`
- ESLint ignore rule for `src/generated/**/*` (Prisma-generated code)
- `archive/sample-trading-payment-domain` git branch (backup of pre-cleanup state)
- `_bmad-output/EXECUTION_PLAN.md` (5-phase upgrade plan, doc-grounded, self-contained for non-stop execution)
- New `CLAUDE.md` for NestJS + Prisma stack
- `DATABASE_URL` env var (replaces TypeORM split env vars)

### Removed (BREAKING)

- **TypeORM (`typeorm`, `@nestjs/typeorm`)** — entirely
- `env-cmd` — no longer needed (Prisma reads `.env` directly)
- `src/database/` — config, migrations, seeds, data-source
- `src/infrastructure/persistence/entities/` (TypeORM `@Entity` classes)
- TypeORM-based repositories and `*.repository.impl.ts` delegate wrappers
- `src/utils/entity-helper.ts` (TypeORM `BaseEntity` helper)
- **Business modules**: `payment` (TransFi integration), `trading` (Alpaca integration)
- TransFi/Alpaca/KYC/streak/portfolio/notification entities, events, value-objects, DTOs, configs
- Legacy `.cursor/rules/*` (superseded by `.claude/` toolchain)
- Legacy `.hygen/` templates (TypeORM-shaped; need rewrite for Prisma)
- `package.json` scripts: `typeorm`, `migration:*`, `seed:run`, `schema:drop`, `app:config`
- `@Global()` decorator on `IdentityModule` (encapsulation per bounded context)

### Changed

- Project name: `teko-backend` → `nest-clean-arch-boilerplate`
- `.env.example`: `DATABASE_NAME=uob_portal` → `DATABASE_NAME=app`; added `DATABASE_URL`; removed TransFi/Alpaca env blocks
- `src/config/config.type.ts`: dropped `DatabaseConfig` and `AlpacaConfig` from `AllConfigType`
- `app.module.ts`: uses `PrismaModule` instead of `TypeOrmModule.forRootAsync`
- `identity.module.ts` and `authorization.module.ts`: DI tokens now bound to `Prisma*Repository` classes
- CASL factory: unchanged (still uses `createMongoAbility`; `@casl/prisma` migration deferred to Phase 5 — no functional impact)

### Bounded contexts kept

- `identity` — registration, login, password reset, refresh token, WebAuthn passkeys
- `authorization` — roles, permissions (CASL)
- `health` — `@nestjs/terminus` health checks

### Verification

- `bunx tsc --noEmit`: 0 errors
- `bun run lint`: 0 errors
- `bun run build`: success
- `bun run test`: 12/12 suites, 49/49 tests pass
- `bunx prisma format`: success
- `bunx prisma generate`: success (client at `src/generated/prisma`)

### Migration steps still required (Phase 3F — requires running Postgres)

1. Start Postgres: `docker compose up -d postgres`
2. Drop legacy `_typeorm_migrations` table (one-time SQL): `psql ... -c 'DROP TABLE IF EXISTS "_typeorm_migrations"'`
3. (Optional) Verify schema against live DB: `bunx prisma db pull --print`
4. Create baseline migration:
   ```bash
   mkdir -p prisma/migrations/0_init
   bunx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql
   bunx prisma migrate resolve --applied 0_init
   ```
5. Seed: `bun run db:seed`
6. Smoke test endpoints (register, login, refresh, WebAuthn ceremony, role/permission queries)

### Phase 5 roadmap (preview)

- AggregateRoot base class with domain events from entities
- Value Objects: Email, Password, UserId, HashedPassword
- ESLint rule blocking `@nestjs/*` and `@prisma/*` imports in `src/domain/**`
- `nestjs-zod` for env config validation
- Helmet + `@nestjs/throttler` (Redis storage) + CORS whitelist
- Pino + `nestjs-pino` + `nestjs-cls` (request-id)
- OpenTelemetry + `nestjs-otel` (trace/log correlation with Pino)
- Prometheus metrics endpoint
- Redis adapter for WebAuthn challenge store (replaces InMemoryChallengeStore)
- `@casl/prisma` migration (SQL-level filtering via `accessibleBy`)
- Transactional Outbox for domain events
- Jest coverage threshold 70% global, 90% domain
- Rewrite `.hygen/module/new/` templates for Prisma

---

## Pre-v2.0.0

See git history before commit `cb8654f`. Repo was a NestJS + TypeORM boilerplate with TransFi (payment) and Alpaca (trading) integration code; rebranded from `teko-backend`.
