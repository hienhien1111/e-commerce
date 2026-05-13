# EXECUTION PLAN — `backend-boilerplate` Cleanup + Prisma 7 Migration

> **Mode:** Non-stop autonomous execution across sessions.
> **Authors:** Mary (analyst) + Winston (architect), orchestrated 2026-05-12.
> **Source of truth:** This file. Each phase is self-contained — runnable in a fresh chat context by re-reading this file.

---

## EXECUTIVE DEFAULTS (locked unless user objects)

1. **Project name:** `nest-clean-arch-boilerplate`
2. **Runtime:** Bun ≥ 1.0 (kept)
3. **`@nestjs/cqrs`:** kept (architectural value)
4. **Toolchain (`.claude/`, `_bmad/`, `bmalph/`, `.ralph/`):** kept tích hợp; gitignore subdirs có volatile state nếu cần
5. **ORM:** Prisma 7 (driver-adapter mode with `@prisma/adapter-pg`)
6. **DB:** PostgreSQL (existing localhost:5433)
7. **Bounded contexts giữ lại:** `identity`, `authorization`, `health` (xoá `payment`, `trading`)

---

## PHASE 0 — DOCUMENTATION DISCOVERY (DONE)

### 0.1 — Allowed APIs (verified from official docs)

#### Prisma 7 CLI (verified `prisma.io/docs/orm/reference/prisma-cli-reference`)
- ✅ `prisma init` — bootstraps schema + prisma.config.ts + .env
- ✅ `prisma db pull` — introspect existing DB (flags: `--force`, `--print`, `--schema`)
- ✅ `prisma migrate dev --name <name>` — create + apply dev migration (does **NOT** auto-run `generate` or seed in v7)
- ✅ `prisma migrate deploy` — apply pending in prod
- ✅ `prisma migrate diff --from-empty --to-schema-datamodel <path> --script` — generate baseline SQL
- ✅ `prisma migrate resolve --applied <name>` — mark migration as applied without running
- ✅ `prisma generate` — generate client
- ✅ `prisma db seed` — runs `migrations.seed` from prisma.config.ts
- ✅ `prisma studio` — DB GUI
- ❌ **`prisma bootstrap` does NOT exist** — that's a misreading of marketing copy; use `prisma init`

#### Prisma 7 schema requirements (verified `prisma.io/docs/orm/prisma-schema/overview/generators`)
- ✅ `provider = "prisma-client"` (NEW — old `prisma-client-js` deprecated)
- ✅ `output = "../src/generated/prisma"` (REQUIRED in v7)
- ✅ `moduleFormat = "cjs"` (REQUIRED for NestJS — Prisma 7 ships ESM by default)
- ✅ Generated client lives in **project source**, NOT `node_modules`
- ✅ Import: `import { PrismaClient } from './generated/prisma/client'`

#### PrismaService pattern (verified NestJS recipe + Prisma NestJS guide)
- ✅ Driver-adapter pattern — no `$connect()` in `onModuleInit`
- ✅ Postgres adapter: `@prisma/adapter-pg`, class `PrismaPg`
- ✅ Instantiate with `super({ adapter })`
- ❌ **Do NOT** use legacy `implements OnModuleInit { onModuleInit() { return this.$connect(); } }` — superseded in v7
- ⚠️ Official guides register `PrismaService` directly in `AppModule.providers`. Project preference: use `@Global() PrismaModule` for hexagonal cleanliness (acceptable deviation, not anti-pattern).

#### @casl/prisma API (verified official README at github.com/stalniy/casl/packages/casl-prisma)
- ✅ Factory: `createPrismaAbility` (NOT a class constructor)
- ✅ Type: `PrismaAbility<[Actions, Subjects]>` (TYPE alias only — do NOT `new PrismaAbility()`)
- ✅ `Subjects<{ ModelName: ModelType }>` — for typed subject union
- ✅ `accessibleBy(ability).ofType('ModelName')` → returns Prisma `WhereInput`
- ✅ `createCaslExtension()` — Prisma Client `$extends` integration
- ⚠️ Requires `@prisma/client >= 4.16.0` + CASL v6

#### TypeORM → Prisma migration sequence (verified `prisma.io/docs/guides/migrate-from-typeorm`)
```bash
bun add -D prisma && bun add @prisma/client @prisma/adapter-pg pg
bunx prisma init                                    # creates prisma/, .env entry
# Edit DATABASE_URL in .env
bunx prisma db pull                                 # introspect existing DB
# Manually drop _typeorm_migrations table from DB (one-time, since abandoning history)
mkdir -p prisma/migrations/0_init
bunx prisma migrate diff --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql
bunx prisma migrate resolve --applied 0_init        # baseline
bunx prisma generate                                # generate client
```

#### Mapper pattern at hexagonal boundary (verified Sairyss/domain-driven-hexagon)
- `Prisma.Decimal` → convert at mapper boundary (`.toNumber()` / `.toString()`); never in domain
- `Bytes` → `Buffer` in mapper; expose VO in domain
- Relations → use `include`, child mapper recurse
- Transaction: interactive `prisma.$transaction(async tx => ...)`, share via `AsyncLocalStorage`

### 0.2 — Anti-patterns to PREVENT (verified gaps)

| Anti-pattern | Why wrong | Verified source |
|---|---|---|
| `new PrismaAbility()` | Class is type alias, not constructor | @casl/prisma README |
| `implements OnModuleInit { onModuleInit() { return this.$connect() } }` in Prisma 7 | Driver adapter handles lifecycle | NestJS recipe (Prisma 7) |
| `provider = "prisma-client-js"` | Deprecated in v7 | Prisma generators doc |
| Omitting `output` in generator block | Required in v7 | Prisma 7 release notes |
| Omitting `moduleFormat = "cjs"` for NestJS | Default ESM breaks NestJS CJS imports | NestJS recipe |
| Running `prisma migrate dev` and expecting auto-generate | v7 split — must call `prisma generate` separately | Prisma 7 changelog |
| Leaking `Prisma.Decimal`/`Buffer` into domain entities | Domain pollution | Sairyss + DDD principle |
| Using `prisma.$transaction([p1, p2])` batched form for cross-repo writes | Cannot handle conditional logic | Prisma transaction docs |
| `seed` config in `package.json` `"prisma": {"seed": ...}` | Moved to `prisma.config.ts` in v7 | Prisma config reference |
| Calling `prisma bootstrap` | Command does not exist | Prisma CLI reference |

---

## PHASE 1 — CLEANUP IDENTITY & NAMING (1-2 hours)

### 1.1 — Tasks (atomic, run in order)

| # | Task | Command / File | Verification |
|---|---|---|---|
| 1.1.1 | Verify no `.env` committed | `git ls-files \| grep '^\.env$'` → must be empty | Output empty |
| 1.1.2 | Update `package.json` name | Edit `package.json:2`: `"name": "nest-clean-arch-boilerplate"` | grep success |
| 1.1.3 | Update `.env.example`: rename DB | Replace `DATABASE_NAME=uob_portal` → `DATABASE_NAME=app` | grep `=app` |
| 1.1.4 | Remove unused env blocks (TransFi/Alpaca pre-cleanup) | Delete `TRANSFI_*`, `ALPACA_*` blocks from `.env.example` | grep returns 0 |
| 1.1.5 | Bỏ `@Global()` khỏi `IdentityModule` line 100 | Edit `src/application/identity/identity.module.ts` — remove `@Global()` decorator | grep `@Global` returns 0 in identity.module.ts |
| 1.1.6 | Commit | `git add -A && git commit -m "chore: cleanup project identity and naming"` | commit succeeds |

### 1.2 — `CLAUDE.md` rewrite

**Action:** Replace entire `CLAUDE.md` with content below. Verbatim copy.

```markdown
# nest-clean-arch-boilerplate

Production-grade NestJS backend boilerplate using Clean Architecture + DDD + CQRS + Hexagonal (Ports & Adapters).

## Tech Stack
- **Runtime:** Bun ≥ 1.0
- **Framework:** NestJS 11
- **Database:** PostgreSQL + Prisma 7 (driver-adapter mode via `@prisma/adapter-pg`)
- **Auth:** JWT RS256 + WebAuthn passkeys (`@simplewebauthn/server` 13) + Passport
- **Authorization:** CASL 6 + `@casl/prisma` (SQL-level filtering)
- **Cache / shared state:** Redis (planned Phase 3)
- **Test:** Jest (unit) + Supertest (E2E via Docker compose)

## Quick Reference
- `bun run start:dev` — Dev server (port 3002)
- `bun run build` — Production build
- `bun run lint` — ESLint
- `bun run test` — Unit tests
- `bun run test:e2e:docker` — E2E with Docker

## Database (Prisma 7)
ALL schema changes via Prisma migration files in `prisma/migrations/`.
- Pull existing DB: `bunx prisma db pull`
- Generate client: `bunx prisma generate` (lives at `src/generated/prisma`)
- Create migration: `bunx prisma migrate dev --name <name>`
- Deploy: `bunx prisma migrate deploy`
- Studio: `bunx prisma studio`
- Seed: `bunx prisma db seed`

## Architecture
See `docs/architecture.md`.

Layers (dependency inward only):
```
presentation → application → domain ← infrastructure
```
- **Domain:** framework-free; pure TS; entities, VOs, events, services
- **Application:** CQRS handlers (`@nestjs/cqrs`) + ports (interfaces)
- **Infrastructure:** Prisma repos, JWT providers, external adapters
- **Presentation:** HTTP controllers + WebSocket gateways + DTOs

Ports in `application/*/ports/`, Adapters in `infrastructure/`.

## Generate a New Module
`bun run generate:module` (Hygen scaffolds bounded context — see `.hygen/module/new/`).

## Hooks
- Husky `pre-commit`: ESLint + Prettier on staged files
- Husky `commit-msg`: commitlint (Conventional Commits)

## Bounded Contexts (boilerplate ships with)
- `identity` — registration, login, password reset, refresh token, WebAuthn
- `authorization` — roles, permissions (CASL)
- `health` — `@nestjs/terminus` healthcheck

Extend by running `bun run generate:module <name>`.
```

### 1.3 — Verification checklist (Phase 1)
- [ ] `package.json` name = `nest-clean-arch-boilerplate`
- [ ] `.env.example` does NOT contain `TRANSFI_` or `ALPACA_` or `uob_portal`
- [ ] `IdentityModule` does NOT have `@Global()` decorator
- [ ] `CLAUDE.md` mentions Prisma (not Supabase/TypeORM); does not mention HRKit/Phabora
- [ ] `git status` clean after commit

### 1.4 — Anti-pattern guards
- ❌ Do NOT touch `src/` Code in this phase except removing `@Global()`
- ❌ Do NOT start Prisma migration yet (that's Phase 3)

---

## PHASE 2 — DELETE TRANSFI/ALPACA BUSINESS CODE (2-3 hours)

### 2.1 — Safety backup

```bash
git checkout -b archive/sample-trading-payment-domain
git push -u origin archive/sample-trading-payment-domain
git checkout main
```

### 2.2 — Deletion commands (run sequentially)

```bash
# 2.2.1 — Application modules
rm -rf src/application/payment
rm -rf src/application/trading

# 2.2.2 — Infrastructure adapters
rm -f src/infrastructure/adapters/alpaca-api.adapter.ts
rm -f src/infrastructure/adapters/alpaca-http.adapter.ts
rm -f src/infrastructure/adapters/transfi-api.adapter.ts
rm -f src/infrastructure/adapters/transfi-http.adapter.ts

# 2.2.3 — WebSocket layer (was Alpaca-stream only)
rm -rf src/infrastructure/websocket
rm -rf src/presentation/websocket

# 2.2.4 — Persistence entities (TransFi/Alpaca/KYC/streak/portfolio/notification)
cd src/infrastructure/persistence/entities
rm -f transfi-order.entity.ts transfi-user.entity.ts payment-account.entity.ts bank-account.entity.ts
rm -f trading-account.entity.ts trading-token.entity.ts account.entity.ts
rm -f portfolio-holding.entity.ts investment-history.entity.ts user-favorite.entity.ts
rm -f kyc-document.entity.ts kyc-session.entity.ts kyc-verification.entity.ts
rm -f streak.entity.ts user-streak-progress.entity.ts notification.entity.ts user-profile.entity.ts
cd -

# 2.2.5 — Domain entities + value objects + events (payment + trading only)
rm -f src/domain/entities/payment-order.ts
rm -f src/domain/entities/payment-user.ts
rm -f src/domain/entities/trading-token.ts
rm -f src/domain/value-objects/kyc-status.ts
rm -f src/domain/value-objects/order-status.ts
rm -f src/domain/events/payment-kyc-approved.event.ts
rm -f src/domain/events/payment-kyc-rejected.event.ts
rm -f src/domain/events/payment-order-completed.event.ts
rm -f src/domain/events/payment-order-failed.event.ts

# 2.2.6 — Repository implementations
rm -f src/infrastructure/persistence/repositories/trading-token.repository.ts
rm -f src/infrastructure/persistence/repositories/transfi-order.repository.ts
rm -f src/infrastructure/persistence/repositories/transfi-user.repository.ts

# 2.2.7 — Config
rm -f src/infrastructure/config/alpaca.config.ts
rm -f src/infrastructure/config/transfi.config.ts 2>/dev/null  # may not exist
```

### 2.3 — Update `src/app.module.ts`

**Action:** Edit `src/app.module.ts` to remove `TradingModule` and `PaymentModule` imports.

**Before:**
```typescript
import { TradingModule } from './application/trading/trading.module';
import { PaymentModule } from './application/payment/payment.module';
// ...
imports: [
  ConfigModule.forRoot({ /* ... */ load: [databaseConfig, authConfig, webauthnConfig, alpacaConfig, appConfig] }),
  infrastructureDatabaseModule,
  HealthModule,
  IdentityModule,
  AuthorizationModule,
  TradingModule,
  PaymentModule,
],
```

**After:**
```typescript
// (remove TradingModule + PaymentModule imports entirely)
// (remove alpacaConfig from load array)
imports: [
  ConfigModule.forRoot({ /* ... */ load: [databaseConfig, authConfig, webauthnConfig, appConfig] }),
  infrastructureDatabaseModule,
  HealthModule,
  IdentityModule,
  AuthorizationModule,
],
```

### 2.4 — Verification

```bash
# Run these — all must pass
bun install
bun run build           # must compile
bun run lint            # must pass
bunx tsc --noEmit       # must pass
bun run test            # remaining tests must pass

# Greps that MUST return 0 results:
grep -r "alpaca\|transfi\|kyc\|streak\|portfolio" src/ --include="*.ts" | wc -l   # → 0
grep -r "TradingModule\|PaymentModule" src/ --include="*.ts" | wc -l              # → 0
```

### 2.5 — Anti-pattern guards
- ❌ Do NOT delete `src/database/migrations/` yet — Phase 3 handles that
- ❌ Do NOT delete `node_modules/` — let `bun install` handle dep cleanup
- ❌ Do NOT remove `domain/entities/user.ts`, `role.ts`, `permission.ts`, `session.ts`, `webauthn-credential.ts`

### 2.6 — Commit

```bash
git add -A
git commit -m "refactor: remove TransFi and Alpaca business modules from boilerplate"
```

---

## PHASE 3 — MIGRATE TYPEORM → PRISMA 7 (5-7 days, broken into 5 sub-phases)

### 3A — Install Prisma + introspect (Day 1, ~2 hours)

#### 3A.1 — Install
```bash
bun add -D prisma
bun add @prisma/client @prisma/adapter-pg pg
bun remove typeorm @nestjs/typeorm
```

#### 3A.2 — Init Prisma
```bash
bunx prisma init --datasource-provider postgresql
```
This creates:
- `prisma/schema.prisma`
- `prisma.config.ts`
- `.env` entry for `DATABASE_URL`

#### 3A.3 — Edit `prisma/schema.prisma` header (BEFORE introspect)

Verbatim — copy this block:

```prisma
generator client {
  provider     = "prisma-client"
  output       = "../src/generated/prisma"
  moduleFormat = "cjs"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

#### 3A.4 — Set `DATABASE_URL` in `.env`

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/app?schema=public"
```

#### 3A.5 — Introspect existing Postgres
```bash
bunx prisma db pull
```
This populates `schema.prisma` with models from the live DB.

#### 3A.6 — Manual cleanup of generated schema

After introspection, manually edit `prisma/schema.prisma`:
- Keep ONLY models: `users`, `roles`, `permissions`, `sessions`, `webauthn_credentials` (+ join tables if any)
- Delete any TransFi/Alpaca/KYC/streak/notification/portfolio models that Phase 2 missed
- Verify each `@map()` and `@@map()` for snake_case mapping
- Verify enums (e.g., role names, permission actions) are declared with Prisma `enum`

#### 3A.7 — Generate client
```bash
bunx prisma generate
```

#### 3A.8 — Verification
- [ ] `src/generated/prisma/` directory exists with generated client
- [ ] `prisma/schema.prisma` contains 5 models max (User, Role, Permission, Session, WebAuthnCredential)
- [ ] No TransFi/Alpaca/KYC traces in schema
- [ ] `bunx prisma format` runs without errors

### 3B — PrismaService + DI wiring (Day 2, ~3 hours)

#### 3B.1 — Create `PrismaService` (Prisma 7 driver-adapter pattern)

**File:** `src/infrastructure/persistence/prisma/prisma.service.ts`

Copy verbatim (from Prisma official NestJS guide):

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL as string,
    });
    super({ adapter });
  }
}
```

**Anti-pattern guard:** Do NOT add `implements OnModuleInit` or `$connect()` — Prisma 7 driver adapter handles lifecycle automatically.

#### 3B.2 — Create `PrismaModule`

**File:** `src/infrastructure/persistence/prisma/prisma.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

(Project convention: `@Global` here is acceptable because PrismaService is infrastructure-level shared utility, not a bounded context.)

#### 3B.3 — Wire into `AppModule`

**File:** `src/app.module.ts`

Add `PrismaModule` to imports, remove TypeORM:

```typescript
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
// ...
// REMOVE:
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { TypeOrmConfigService } from './database/config.service';
// const infrastructureDatabaseModule = TypeOrmModule.forRootAsync({ ... });

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [authConfig, webauthnConfig, appConfig], envFilePath: ['.env'] }),
    PrismaModule,
    HealthModule,
    IdentityModule,
    AuthorizationModule,
  ],
})
export class AppModule {}
```

(Note: `databaseConfig` import removed because Prisma reads `DATABASE_URL` directly from env.)

#### 3B.4 — Verification
- [ ] `src/database/` folder can be deleted after this step (do in 3E)
- [ ] `grep -r "TypeOrmModule\|@nestjs/typeorm" src/` returns 0
- [ ] App starts: `bun run start:dev` (will error on missing repositories — that's expected, fix in 3C)

### 3C — Migrate repositories (Day 3, ~6 hours)

For each of the 5 repositories, create Prisma adapter + mapper.

#### 3C.1 — Create mapper for User

**File:** `src/infrastructure/persistence/mappers/user.mapper.ts`

```typescript
import { User as PrismaUser, Role as PrismaRole } from '../../../generated/prisma/client';
import { User } from '../../../domain/entities/user';
import { Role } from '../../../domain/entities/role';
import { UserFactory } from '../../../domain/factories/user.factory';
import { RoleFactory } from '../../../domain/factories/role.factory';

type PrismaUserWithRole = PrismaUser & { role?: PrismaRole | null };

export class UserMapper {
  static toDomain(row: PrismaUserWithRole): User {
    return UserFactory.reconstitute({
      id: row.id,
      email: row.email,
      password: row.password ?? undefined,
      provider: row.provider,
      socialId: row.socialId,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role ? RoleMapper.toDomain(row.role) : null,
      roleId: row.roleId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt ?? undefined,
    });
  }

  static toPersistence(user: User): Omit<PrismaUser, 'createdAt' | 'updatedAt'> {
    return {
      id: user.id,
      email: user.email,
      password: user.password ?? null,
      provider: user.provider,
      socialId: user.socialId ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      roleId: user.roleId ?? null,
      deletedAt: user.deletedAt ?? null,
    };
  }
}

export class RoleMapper {
  static toDomain(row: PrismaRole): Role {
    return RoleFactory.reconstitute({
      id: row.id,
      name: row.name,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}
```

**Adjust per actual `User` entity properties** (check `src/domain/entities/user.ts` getters).

#### 3C.2 — Create Prisma repository

**File:** `src/infrastructure/persistence/repositories/prisma-user.repository.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../../application/identity/ports/user/user.repository.port';
import { User } from '../../../domain/entities/user';
import { PrismaService } from '../prisma/prisma.service';
import { UserMapper } from '../mappers/user.mapper';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({
      where: { id },
      include: { role: true },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findFirst({
      where: { email, deletedAt: null },
      include: { role: true },
    });
    return row ? UserMapper.toDomain(row) : null;
  }

  async save(user: User): Promise<User> {
    const data = UserMapper.toPersistence(user);
    const row = await this.prisma.user.upsert({
      where: { id: user.id },
      create: data,
      update: data,
      include: { role: true },
    });
    return UserMapper.toDomain(row);
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
```

**Anti-pattern guard:** Match the EXACT method signatures in `UserRepositoryPort`. Add/remove methods to match port, NOT to add new behavior.

#### 3C.3 — Repeat for the other 4 repositories
Apply same pattern to:
- `prisma-session.repository.ts` (implements `SessionRepositoryPort`)
- `prisma-role.repository.ts` (implements `RoleRepositoryPort`)
- `prisma-permission.repository.ts` (implements `PermissionRepositoryPort`)
- `prisma-webauthn-credential.repository.ts` (implements `WebAuthnCredentialRepositoryPort`)

For each:
1. Read the existing TypeORM repository file
2. Read the corresponding port interface
3. Read the existing mapper (if any)
4. Create Prisma version with same port signatures

#### 3C.4 — Update DI bindings

**File:** `src/application/identity/identity.module.ts`

Replace:
```typescript
import { TypeOrmUserRepository } from '@/infrastructure/persistence/repositories/user.repository';
// ...
providers: [
  // ...
  TypeOrmUserRepository,
  { provide: USER_REPOSITORY_PORT, useExisting: TypeOrmUserRepository },
```

With:
```typescript
import { PrismaUserRepository } from '@/infrastructure/persistence/repositories/prisma-user.repository';
// ...
providers: [
  // ...
  PrismaUserRepository,
  { provide: USER_REPOSITORY_PORT, useExisting: PrismaUserRepository },
```

Also remove `TypeOrmModule.forFeature([UserEntity, SessionEntity, WebAuthnCredentialEntity])` from `imports`.

Repeat for `authorization.module.ts`.

#### 3C.5 — Delete legacy TypeORM repositories & entities
```bash
rm -f src/infrastructure/persistence/repositories/user.repository.ts
rm -f src/infrastructure/persistence/repositories/user.repository.impl.ts
rm -f src/infrastructure/persistence/repositories/session.repository.ts
rm -f src/infrastructure/persistence/repositories/session.repository.impl.ts
rm -f src/infrastructure/persistence/repositories/role.repository.ts
rm -f src/infrastructure/persistence/repositories/permission.repository.ts
rm -f src/infrastructure/persistence/repositories/webauthn-credential.repository.impl.ts

# Persistence entities (TypeORM @Entity decorators) — now obsolete
rm -f src/infrastructure/persistence/entities/user.entity.ts
rm -f src/infrastructure/persistence/entities/role.entity.ts
rm -f src/infrastructure/persistence/entities/permission.entity.ts
rm -f src/infrastructure/persistence/entities/session.entity.ts
rm -f src/infrastructure/persistence/entities/webauthn-credential.entity.ts

# Old mappers (will be replaced by new Prisma mappers in step 3C.1)
rm -rf src/infrastructure/persistence/mappers  # only if all old mappers obsolete
# Re-create with Prisma mappers
mkdir -p src/infrastructure/persistence/mappers
```

#### 3C.6 — Verification
```bash
bun run build && bun run lint && bunx tsc --noEmit
grep -r "@nestjs/typeorm\|typeorm" src/ --include="*.ts" | wc -l   # must → 0
```

### 3D — CASL + Prisma integration (Day 4, ~3 hours)

#### 3D.1 — Install
```bash
bun add @casl/prisma
```

#### 3D.2 — Rewrite `CaslAbilityFactory`

**File:** `src/infrastructure/casl/casl-ability.factory.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { AbilityBuilder } from '@casl/ability';
import { createPrismaAbility, PrismaAbility, Subjects } from '@casl/prisma';
import type { User, Role, Permission } from '../../generated/prisma/client';
import { PrismaService } from '../persistence/prisma/prisma.service';

type AppSubjects = 'all' | Subjects<{
  User: User;
  Role: Role;
  Permission: Permission;
}>;

export type AppAbility = PrismaAbility<[string, AppSubjects]>;

@Injectable()
export class CaslAbilityFactory {
  constructor(private readonly prisma: PrismaService) {}

  async createForUser(userId: string): Promise<AppAbility> {
    const permissions = await this.prisma.permission.findMany({
      where: { roles: { some: { users: { some: { id: userId } } } } },
    });

    const { can, cannot, build } = new AbilityBuilder<AppAbility>(createPrismaAbility);

    for (const p of permissions) {
      can(p.action as string, p.subject as any);
    }

    return build();
  }
}
```

**Anti-pattern guard:** Do NOT use `new PrismaAbility()` — that's a TYPE alias, not a constructor. Use `createPrismaAbility` as the factory argument to `AbilityBuilder`.

#### 3D.3 — Update guards
Audit `src/infrastructure/guards/permissions.guard.ts` and `roles.guard.ts`. Replace any `Ability` references with `AppAbility`. Consider replacing both with a single `PoliciesGuard` (Phase 4 task).

#### 3D.4 — Verification
- [ ] `grep -r "new PrismaAbility" src/` returns 0
- [ ] `bun run lint` passes
- [ ] `bun run test` for any auth tests passes (or fails for documented reasons)

### 3E — Migration system + cleanup (Day 5, ~4 hours)

#### 3E.1 — Drop old TypeORM migration table
Run against the dev DB (one-time):
```sql
DROP TABLE IF EXISTS "_typeorm_migrations";
```

#### 3E.2 — Baseline Prisma migration
```bash
mkdir -p prisma/migrations/0_init
bunx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/0_init/migration.sql
bunx prisma migrate resolve --applied 0_init
```

#### 3E.3 — Update `prisma.config.ts`

```typescript
import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
```

Install `tsx` if not present: `bun add -D tsx`.

#### 3E.4 — Create seed file

**File:** `prisma/seed.ts`

Port logic from `src/database/seeds/run-seed.ts` (read it first). Skeleton:

```typescript
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Seed roles (read from src/database/seeds/role-seed*.ts for source data)
  await prisma.role.upsert({
    where: { name: 'admin' },
    create: { name: 'admin' },
    update: {},
  });
  await prisma.role.upsert({
    where: { name: 'user' },
    create: { name: 'user' },
    update: {},
  });
  // Seed permissions similarly
  // ...
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
```

#### 3E.5 — Update `package.json` scripts

Remove TypeORM scripts:
- `typeorm`
- `migration:generate`
- `postmigration:generate`
- `migration:create`
- `migration:run`
- `migration:revert`
- `seed:run`
- `schema:drop`

Add Prisma scripts:
```json
"db:generate": "prisma generate",
"db:migrate:dev": "prisma migrate dev",
"db:migrate:deploy": "prisma migrate deploy",
"db:studio": "prisma studio",
"db:seed": "prisma db seed",
"db:pull": "prisma db pull",
"postinstall": "prisma generate"
```

Also remove from `dependencies`/`devDependencies` (if `bun remove` in 3A.1 didn't catch them):
- `typeorm`
- `@nestjs/typeorm`
- `env-cmd` (no longer needed)

#### 3E.6 — Delete `src/database/` (legacy TypeORM home)
```bash
rm -rf src/database
```

#### 3E.7 — Update `docs/architecture.md` and `docs/creating-a-new-module.md`
Read each file, replace TypeORM references with Prisma equivalents.

#### 3E.8 — Update Hygen templates

Read `.hygen/module/new/`, update any `@nestjs/typeorm` references / `@Entity` decorators to Prisma patterns. (May require rewriting the template entirely for Prisma; see Sairyss repo for reference.)

#### 3E.9 — Verification
```bash
bun run build && bun run lint && bunx tsc --noEmit
bun run test
bun run test:e2e:docker

# Greps that MUST return 0:
grep -r "@nestjs/typeorm\|typeorm" src/ --include="*.ts" | wc -l         # → 0
grep -r "@Entity\|@Column\|@PrimaryGeneratedColumn" src/ --include="*.ts" | wc -l  # → 0
grep -r "DataSource\|InjectRepository" src/ --include="*.ts" | wc -l     # → 0
test -d src/database && echo "FAIL: src/database still exists" || echo "OK"
test -d src/generated/prisma && echo "OK" || echo "FAIL: client not generated"
```

#### 3E.10 — Commit (with breaking marker)
```bash
git add -A
git commit -m "refactor!: migrate ORM from TypeORM to Prisma 7

BREAKING CHANGE: Database access layer replaced. All TypeORM imports removed.
- Prisma 7 driver-adapter mode with @prisma/adapter-pg
- Client generated at src/generated/prisma
- Migrations live in prisma/migrations/
- Schema in prisma/schema.prisma
- Seed via tsx prisma/seed.ts (configured in prisma.config.ts)
- CASL switched to @casl/prisma for SQL-level filtering"
```

---

## PHASE 4 — VERIFY & FREEZE PHASE 1 (1 day)

### 4.1 — Smoke test flows (manual)

Run `bun run start:dev` and test each:

| Flow | Endpoint | Expected |
|---|---|---|
| Register | `POST /api/v1/auth/register` | 201 + user object |
| Login (email/password) | `POST /api/v1/auth/login` | 200 + token + refreshToken |
| Refresh | `POST /api/v1/auth/refresh` | 200 + new tokens |
| Get me | `GET /api/v1/auth/me` (with Bearer) | 200 + user |
| Logout | `POST /api/v1/auth/logout` | 204 |
| WebAuthn register options | `POST /api/v1/webauthn/registration/options` | 200 + challenge |
| WebAuthn auth options | `POST /api/v1/webauthn/authentication/options` | 200 + challenge |
| List users (admin) | `GET /api/v1/users` | 200 + paginated list |
| Health | `GET /api/v1/health` | 200 + healthy |

### 4.2 — Final verification
- [ ] `bun run build` succeeds
- [ ] `bun run lint` passes
- [ ] `bunx tsc --noEmit` passes
- [ ] `bun run test` 100% pass (existing 22 specs)
- [ ] `bun run test:e2e:docker` passes
- [ ] `bunx prisma studio` opens, all 5 tables visible with seed data
- [ ] No `@nestjs/typeorm` in `package.json` dependencies
- [ ] No `typeorm` in `package.json` dependencies
- [ ] `src/generated/prisma/` exists and is gitignored (add to .gitignore if missing)

### 4.3 — `.gitignore` updates
Add if missing:
```
# Prisma 7 generated client
src/generated/

# Prisma local artifacts
prisma/.cache/
```

### 4.4 — Tag release
```bash
git tag v2.0.0-phase1-cleanup
git push --tags
```

### 4.5 — Update CHANGELOG.md
Document Phase 1 breaking changes.

---

## PHASE 5 — PREVIEW (NOT IN SCOPE for this plan; documented for continuity)

After Phase 1 freezes, proceed to:

### Phase 5A — Architecture Upgrade
- `AggregateRoot` base class with `addDomainEvent()` / `pullDomainEvents()`
- Value Objects: `Email`, `Password`, `UserId`, `HashedPassword`
- ESLint rule blocking `@nestjs/*` and `@prisma/*` in `src/domain/**`
- Hybrid validation: `nestjs-zod` for env config
- Transactional Outbox for domain events
- Saga orchestration with `@nestjs/cqrs` Saga decorator

### Phase 5B — Production Hardening
- `helmet`, `@nestjs/throttler` (Redis-backed via `@nest-lab/throttler-storage-redis`)
- CORS whitelist from env
- `Pino` + `nestjs-pino` + `nestjs-cls` for request-id
- `OpenTelemetry` + `nestjs-otel` + `PinoInstrumentation` (trace/log correlation)
- Prometheus `/metrics` endpoint
- Redis adapter for WebAuthn challenge store (replacing `InMemoryChallengeStore`)
- Jest coverage threshold 70% global, 90% `src/domain`

---

## EXECUTION CONTRACT

When resuming this plan in a fresh session:
1. Read this file end-to-end first.
2. Run `git status` and `git log -5 --oneline` to see what's already done.
3. Find the next un-checked phase verification list; start there.
4. Each command listed in this plan is verbatim — do not invent.
5. If you discover a discrepancy between this plan and code, STOP and ask the user before improvising.

**Phase 1A through 4 must run in order. Do not skip.**

