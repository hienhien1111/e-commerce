# nest-clean-arch-boilerplate

Production-grade NestJS backend boilerplate using Clean Architecture + DDD + CQRS + Hexagonal (Ports & Adapters).

## Tech Stack

- **Runtime:** Bun ≥ 1.0
- **Framework:** NestJS 11
- **Database:** PostgreSQL + Prisma 7 (driver-adapter mode via `@prisma/adapter-pg`)
- **Auth:** JWT RS256 + WebAuthn passkeys (`@simplewebauthn/server` 13) + Passport
- **Authorization:** CASL 6 + `@casl/prisma` (SQL-level filtering)
- **Cache / shared state:** Redis (planned Phase 3 hardening)
- **Test:** Jest (unit) + Supertest (E2E via Docker compose)
- **Build:** SWC (via NestJS CLI)
- **Linter:** ESLint 9 (flat config) + Prettier 3

## Quick Reference

```bash
bun run start:dev         # Dev server (port 3002)
bun run build             # Production build
bun run lint              # ESLint
bun run test              # Unit tests (Jest)
bun run test:e2e:docker   # E2E tests with Docker compose
```

## Database (Prisma 7)

ALL schema changes via Prisma migration files in `prisma/migrations/`.

```bash
bunx prisma db pull              # Introspect existing DB → schema.prisma
bunx prisma generate             # Generate client → src/generated/prisma
bunx prisma migrate dev --name X # Create + apply dev migration
bunx prisma migrate deploy       # Apply pending migrations (prod)
bunx prisma studio               # DB GUI
bunx prisma db seed              # Run prisma/seed.ts (configured in prisma.config.ts)
```

**Prisma 7 specifics:**
- Generated client lives at `src/generated/prisma` (NOT `node_modules`)
- Uses driver adapter pattern (`@prisma/adapter-pg`) — no `$connect()` in service lifecycle
- Schema generator must declare `output` and `moduleFormat = "cjs"` for NestJS

## Architecture

See [`docs/architecture.md`](docs/architecture.md).

Layers (dependency flows inward only):

```
presentation  →  application  →  domain  ←  infrastructure
```

- **Domain** (`src/domain/`): framework-free; entities, value objects, events, domain services
- **Application** (`src/application/`): CQRS handlers (`@nestjs/cqrs`), ports (interfaces), strategies
- **Infrastructure** (`src/infrastructure/`): Prisma repositories, JWT providers, CASL, Passport strategies
- **Presentation** (`src/presentation/`): HTTP controllers + WebSocket gateways + DTOs

Ports live in `application/*/ports/`; concrete adapters in `infrastructure/`. DI binding via Symbol tokens.

## Bounded Contexts (boilerplate ships with)

- **`identity`** — registration, login, password reset, refresh token, WebAuthn passkeys
- **`authorization`** — roles, permissions (CASL)
- **`health`** — `@nestjs/terminus` health checks

Extend by adding new bounded context under `src/application/<context>/`.

## Hooks

- Husky `pre-commit`: ESLint + Prettier on staged files
- Husky `commit-msg`: commitlint (Conventional Commits enforced)

## Testing Policy

- Default to **test-first** for any change with logic or behavior
- Co-locate tests with source: `src/**/*.spec.ts`
- Domain layer (`src/domain/`) is pure TypeScript — easiest to unit test
- Run full checks before declaring work complete:

```bash
bun run test
bun run lint
bunx tsc --noEmit
bun run build
```

## Project Identity Decisions

- ORM: **Prisma 7 only** (TypeORM removed in v2.0.0 migration)
- Validation: `class-validator` for HTTP DTO boundary; `nestjs-zod` planned for env/config (Phase 5)
- Auth: JWT RS256 + WebAuthn (passkeys); social login not included
- Observability (Pino, OpenTelemetry, Prometheus) planned for Phase 5 production hardening

## Reference Documentation

| File | Purpose |
|------|---------|
| `docs/architecture.md` | Clean Architecture, CQRS, Hexagonal patterns explained |
| `docs/creating-a-new-module.md` | Step-by-step guide to add a bounded context |
| `docs/aggregate-design.md` | DDD aggregate boundaries and invariants |
| `docs/rbac-with-casl.md` | Authorization model with CASL |
| `docs/testing-auth-endpoints.md` | Auth flow testing guide |
| `_bmad-output/EXECUTION_PLAN.md` | Phase 1–5 upgrade plan (cleanup + Prisma migration + hardening) |

## Toolchain Notes

This boilerplate ships with an opinionated AI-assisted dev toolchain:
- `.claude/` — Claude Code commands, hooks, skills
- `_bmad/` — BMAD methodology (analyst, architect, PM, SM, dev agents)
- `bmalph/` — State management for BMAD workflows
- `.ralph/` + `ralph.sh` — Autonomous agent execution loop

These are **optional**. If you don't use them, simply ignore — they have no runtime impact on the backend.
