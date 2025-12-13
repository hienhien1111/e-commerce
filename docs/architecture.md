# Architecture Documentation

## Overview

This project follows a **Clean Architecture** approach combined with **CQRS (Command Query Responsibility Segregation)** and **Hexagonal Architecture (Ports & Adapters)** patterns. The architecture is designed to be maintainable, testable, and scalable.

## Architecture Patterns

### 1. Clean Architecture Layers

The codebase is organized into distinct layers with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│   (HTTP Controllers, WebSocket Gateways, DTOs)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│   (Commands, Queries, Handlers, Ports, Event Handlers)      │
│   Organized by Feature Modules: identity, authorization,     │
│   payment, trading                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                      Domain Layer                            │
│   (Entities, Value Objects, Domain Events, Factories,        │
│    Business Enums, Exceptions, Domain Services)              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   Infrastructure Layer                       │
│   (Adapters, Persistence, Providers, Strategies,             │
│    External Service Clients)                                 │
└─────────────────────────────────────────────────────────────┘
```

### 2. CQRS Pattern

**Command Query Responsibility Segregation** separates read and write operations:

- **Commands**: Represent write operations (create, update, delete)
  - Located in: `application/{module}/commands/{command-name}/`
  - Each command folder contains: `command.ts`, `handler.ts`, `result.ts`, `index.ts`
  - Dispatched via: `CommandBus` from `@nestjs/cqrs`

- **Queries**: Represent read operations (get, list, find)
  - Located in: `application/{module}/queries/{query-name}/`
  - Each query folder contains: `query.ts`, `handler.ts`, `result.ts`, `index.ts`
  - Dispatched via: `QueryBus` from `@nestjs/cqrs`

**Example Flow:**

```
Controller → CommandBus/QueryBus → Handler → Port → Adapter → External Service/DB
```

### 3. Hexagonal Architecture (Ports & Adapters)

The application defines **ports** (interfaces) that are implemented by **adapters** (concrete implementations):

- **Ports**: Define contracts/interfaces in `application/{module}/ports/`
  - Each port has: `{name}.port.ts` (interface) and `{name}.port.token.ts` (DI token)
- **Adapters**: Implement ports in `infrastructure/adapters/` or `infrastructure/providers/`
- **Dependency Injection**: Uses Symbol tokens for port binding

**Adapter Types:**

- **Driving Adapters** (Primary): Trigger application actions
  - HTTP Controllers (`presentation/http/controllers/`)
  - WebSocket Gateways (`presentation/websocket/`)
- **Driven Adapters** (Secondary): Called by application
  - Repositories (`infrastructure/persistence/repositories/`)
  - External API Clients (`infrastructure/adapters/`)
  - WebSocket Clients (`infrastructure/websocket/`)

## Folder Structure

```
src/
├── app.module.ts                 # Root module
├── main.ts                       # Application entry point
│
├── application/                  # Application layer (Use Cases)
│   ├── identity/                 # Identity module (auth, users)
│   │   ├── commands/            # Write operations
│   │   │   ├── login/
│   │   │   │   ├── login.command.ts
│   │   │   │   ├── login.handler.ts
│   │   │   │   ├── login.handler.spec.ts
│   │   │   │   ├── login.result.ts
│   │   │   │   └── index.ts
│   │   │   ├── register/
│   │   │   ├── logout/
│   │   │   ├── create-user/
│   │   │   ├── update-user/
│   │   │   ├── delete-user/
│   │   │   └── webauthn/        # Nested feature
│   │   │       ├── generate-registration-options/
│   │   │       ├── generate-authentication-options/
│   │   │       ├── verify-registration/
│   │   │       └── revoke-credential/
│   │   ├── queries/             # Read operations
│   │   │   ├── get-me/
│   │   │   ├── get-user/
│   │   │   ├── get-users/
│   │   │   └── webauthn/
│   │   │       └── get-user-credentials/
│   │   ├── ports/               # Port interfaces
│   │   │   ├── user/
│   │   │   │   ├── user.repository.port.ts
│   │   │   │   └── user.repository.port.token.ts
│   │   │   ├── session/
│   │   │   ├── token/
│   │   │   ├── password-hasher/
│   │   │   └── webauthn/
│   │   ├── event-handlers/      # Domain event handlers
│   │   ├── factories/           # Application factories
│   │   ├── strategies/          # Application strategies
│   │   └── identity.module.ts
│   │
│   ├── authorization/           # Authorization module (roles, permissions)
│   │   ├── commands/
│   │   ├── queries/
│   │   │   ├── get-role/
│   │   │   └── get-roles/
│   │   ├── ports/
│   │   │   ├── role/
│   │   │   └── permission/
│   │   └── authorization.module.ts
│   │
│   ├── payment/                 # Payment module (TransFi integration)
│   │   ├── commands/
│   │   ├── queries/
│   │   ├── ports/
│   │   └── payment.module.ts
│   │
│   └── trading/                 # Trading module (Alpaca integration)
│       ├── commands/
│       ├── queries/
│       ├── ports/
│       └── trading.module.ts
│
├── domain/                      # Domain layer (Business Logic)
│   ├── entities/                # Domain entities
│   │   ├── user.ts
│   │   ├── role.ts
│   │   ├── permission.ts
│   │   ├── session.ts
│   │   ├── trading-token.ts
│   │   ├── payment-user.ts
│   │   ├── payment-order.ts
│   │   └── webauthn-credential.ts
│   ├── factories/               # Entity factories
│   │   ├── user.factory.ts
│   │   ├── role.factory.ts
│   │   ├── permission.factory.ts
│   │   ├── session.factory.ts
│   │   └── webauthn-credential.factory.ts
│   ├── services/                # Domain services & strategies
│   │   ├── user-creation.strategy.ts
│   │   ├── create-basic-user.strategy.ts
│   │   ├── reconstitute-user.strategy.ts
│   │   └── ...
│   ├── value-objects/           # Value objects (immutable)
│   │   ├── kyc-status.ts
│   │   └── order-status.ts
│   ├── events/                  # Domain events
│   │   ├── user-registered.event.ts
│   │   ├── user-logged-in.event.ts
│   │   ├── email-confirmed.event.ts
│   │   ├── payment-kyc-approved.event.ts
│   │   └── ...
│   ├── enums/                   # Business domain enums
│   │   ├── role.enum.ts
│   │   ├── permission-action.enum.ts
│   │   ├── permission-subject.enum.ts
│   │   ├── auth-providers.enum.ts
│   │   ├── kyc-status.enum.ts
│   │   └── ...
│   ├── exceptions/              # Domain-specific exceptions
│   │   ├── user-not-found.exception.ts
│   │   └── user-already-exists.exception.ts
│   ├── strategies/              # Domain strategy interfaces
│   │   └── auth/
│   │       └── i-auth-strategy.ts
│   └── types/                   # Domain types
│       └── casl-conditions.type.ts
│
├── infrastructure/              # Infrastructure layer
│   ├── adapters/                # External API adapters
│   │   ├── alpaca-api.adapter.ts
│   │   ├── alpaca-http.adapter.ts
│   │   ├── transfi-api.adapter.ts
│   │   └── transfi-http.adapter.ts
│   ├── persistence/             # Database persistence
│   │   ├── entities/            # TypeORM entities
│   │   │   ├── user.entity.ts
│   │   │   ├── role.entity.ts
│   │   │   ├── permission.entity.ts
│   │   │   └── ...
│   │   ├── mappers/             # Domain ↔ Persistence mappers
│   │   │   ├── user.mapper.ts
│   │   │   ├── role.mapper.ts
│   │   │   └── ...
│   │   └── repositories/        # Repository implementations
│   │       ├── user.repository.impl.ts
│   │       ├── session.repository.impl.ts
│   │       └── ...
│   ├── providers/               # Service providers
│   │   ├── bcrypt-password-hasher.ts
│   │   ├── jwt-token-provider.ts
│   │   ├── in-memory-challenge-store.ts
│   │   └── password-hasher.module.ts
│   ├── strategies/              # Passport strategies
│   │   ├── jwt.strategy.ts
│   │   ├── jwt-refresh.strategy.ts
│   │   └── anonymous.strategy.ts
│   ├── guards/                  # Authorization guards
│   │   ├── permissions.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/              # Custom decorators
│   │   ├── check-permissions.decorator.ts
│   │   └── roles.decorator.ts
│   ├── casl/                    # CASL ability factory
│   │   └── casl-ability.factory.ts
│   ├── config/                  # Configuration types
│   │   ├── auth.config.ts
│   │   ├── alpaca.config.ts
│   │   ├── webauthn.config.ts
│   │   └── ...
│   ├── dto/                     # Infrastructure DTOs
│   │   └── ...                  # External API response types
│   └── websocket/               # WebSocket clients (driven adapters)
│       └── alpaca-ws-client.service.ts
│
├── presentation/                # Presentation layer
│   ├── http/                    # HTTP interface
│   │   ├── controllers/         # REST controllers
│   │   │   ├── auth.controller.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── role.controller.ts
│   │   │   ├── webauthn.controller.ts
│   │   │   └── well-known.controller.ts
│   │   └── dtos/                # Request/Response DTOs
│   │       ├── auth-login.dto.ts
│   │       ├── auth-register-login.dto.ts
│   │       ├── create-user.dto.ts
│   │       ├── user.dto.ts
│   │       └── webauthn/
│   │           └── ...
│   └── websocket/               # WebSocket interface (driving adapters)
│       └── alpaca-stream.gateway.ts
│
├── shared/                      # Shared utilities
│   └── domain/
│       ├── aggregate-root.ts
│       └── base-domain-model.ts
│
├── utils/                       # Utility functions
│   ├── types/
│   ├── transformers/
│   ├── dto/
│   ├── uuid-v7.ts
│   ├── validate-config.ts
│   └── ...
│
├── config/                      # App configuration
│   ├── app.config.ts
│   └── config.type.ts
│
├── database/                    # Database configuration
│   ├── migrations/
│   ├── seeds/
│   └── config/
│
├── decorators/                  # Global decorators
│   ├── current-user.decorator.ts
│   └── public.decorator.ts
│
├── constants/                   # Global constants
│   └── app.constant.ts
│
└── health/                      # Health check module
    ├── health.controller.ts
    └── health.module.ts
```

## WebSocket Architecture

The project distinguishes between two types of WebSocket components:

### WebSocket Gateways (Presentation Layer)

- **Location**: `presentation/websocket/`
- **Purpose**: Server-side endpoints that clients connect TO
- **Role**: Driving adapters - they trigger application actions based on client messages
- **Example**: `alpaca-stream.gateway.ts` - accepts client connections and broadcasts data

### WebSocket Clients (Infrastructure Layer)

- **Location**: `infrastructure/websocket/`
- **Purpose**: Client connections to external services
- **Role**: Driven adapters - called by the application to connect to external systems
- **Example**: `alpaca-ws-client.service.ts` - connects to Alpaca's streaming API

## Best Practices

### Architecture

1. **Use Commands for Write Operations**: All mutations go through commands
2. **Use Queries for Read Operations**: All reads go through queries
3. **Publish Domain Events**: Use events for side effects and cross-module communication
4. **Define Ports First**: Create port interfaces before adapters
5. **Keep Domain Pure**: Domain layer should have no external dependencies
6. **Dependency Injection**: Always use Symbol tokens for ports
7. **Feature Modules**: Organize application layer by business capability

### Domain-Driven Design

8. **Private Constructors**: Entities use private constructors, created via factories
9. **Factory Pattern**: Use factories for all entity creation
10. **Strategy Pattern**: Different creation scenarios use different strategies
11. **Value Objects**: Encapsulate domain concepts with validation
12. **Domain Events**: Publish events for important business occurrences
13. **Domain Exceptions**: Use domain-specific exceptions for business errors
14. **Mapper Pattern**: Separate domain and persistence models
15. **Ubiquitous Language**: Use business terms in code
16. **Shared Domain**: Domain layer is shared across all modules

### Testing

17. **Unit Tests**: Co-locate with handlers (`*.handler.spec.ts`)
18. **Mock Ports**: Use jest mocks for port interfaces
19. **E2E Tests**: Place in `/test/e2e/` directory

## Testing Strategy

```
src/
├── application/
│   └── identity/
│       └── commands/
│           └── login/
│               ├── login.handler.ts
│               └── login.handler.spec.ts    # Unit test co-located
│
test/
├── e2e/
│   └── auth.e2e-spec.ts                     # E2E tests
├── jest-e2e.json
└── setup-e2e.ts
```

- **Unit Tests**: Test handlers, domain logic, and value objects in isolation
- **Integration Tests**: Test adapters with real infrastructure
- **E2E Tests**: Test complete flows through controllers

## Technology Stack

- **Framework**: NestJS
- **Runtime**: Bun
- **ORM**: TypeORM
- **Database**: PostgreSQL
- **CQRS**: @nestjs/cqrs
- **Authentication**: Passport.js (JWT, Local, Anonymous)
- **Authorization**: CASL
- **Validation**: class-validator, class-transformer
- **API Docs**: Swagger/OpenAPI
- **Testing**: Jest, Supertest

## References

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [CQRS Pattern](https://martinfowler.com/bliki/CQRS.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design](https://domainlanguage.com/ddd/)
