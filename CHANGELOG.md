# Changelog

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
