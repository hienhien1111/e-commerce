# Domain Characterization Guide

This document explains how to characterize domain classes in the Teko Backend project following Domain-Driven Design (DDD) principles. Understanding these concepts is crucial for maintaining a clean and well-organized domain model.

> **Reference**: This guide is based on the [DDD Sample Characterization](https://dddsample.sourceforge.net/characterization.html) and Eric Evans' "Domain-Driven Design" book.

## Overview

When building domain models, we need to carefully classify classes into different categories. The trickiest ones to classify are typically **Entities**, **Aggregates**, **Value Objects**, and **Domain Events**.

**General Rule**: When possible, favor **Value Objects** over **Entities** or **Domain Events**, because they require less attention during implementation. Value Objects can be created and thrown away at will, and since they are immutable, we can pass them around freely. We must be much less cavalier with Entities as identity and life-cycle have to be carefully managed.

## Entities

**Entities** have both a clear identity and a life-cycle with state transitions that we care about.

### Characteristics:

- **Identity**: Each instance has a unique identity that persists throughout its lifetime
- **Lifecycle**: The entity goes through state changes that are important to the business
- **Mutability**: Entities can change their state while maintaining their identity
- **Equality**: Two entities are equal if they have the same identity (ID), not based on their attributes

### Examples in Teko Backend:

**User** (`src/domain/entities/user.ts`):

- Has identity: `id` (UUID)
- Has lifecycle: `state` transitions (active, inactive, suspended, deleted)
- Can be updated: email, password, profile information
- Many user instances exist simultaneously, each tracked individually

**Session** (`src/domain/entities/session.ts`):

- Has identity: `id` (UUID)
- Has lifecycle: Created on login, deleted on logout or expiration
- State changes: Active → Expired
- Each session is unique and must be tracked individually

**Role** (`src/domain/entities/role.ts`):

- Has identity: `id` (UUID) or `name` (unique identifier)
- Has lifecycle: Created, updated, deleted
- Can have permissions added/removed
- Each role instance is unique

### When to Use Entities:

- When you need to track individual instances over time
- When the object has a meaningful identity in the business domain
- When the object's state changes are important to the business
- When you need to reference the object from other parts of the system

## Value Objects

**Value Objects** have no identity; they are defined entirely by their attributes. Two value objects with the same attributes are completely interchangeable.

### Characteristics:

- **No Identity**: They don't have a unique identifier
- **Immutability**: Once created, they cannot be changed
- **Interchangeability**: Two value objects with the same attributes are equal
- **Self-contained**: They contain all the information needed to represent the value

### Examples in Teko Backend:

**Email** (should be a Value Object):

```typescript
export class Email {
  private constructor(private readonly value: string) {
    this.validate(value);
  }

  static create(value: string): Email {
    return new Email(value);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
}
```

**KycStatus** (`src/domain/value-objects/kyc-status.ts`):

- No identity, just represents a status value
- Immutable: 'pending', 'approved', 'rejected', etc.
- Two KycStatus instances with the same value are identical

**OrderStatus** (`src/domain/value-objects/order-status.ts`):

- Represents the state of an order
- Immutable value object
- Interchangeable instances with the same status

### When to Use Value Objects:

- When the concept is defined entirely by its attributes
- When you don't need to track individual instances
- When immutability is desired
- When you want to encapsulate validation logic
- For concepts like: Email, Money, Address, DateRange, etc.

### Implementation Pattern:

```typescript
// Value Objects should be immutable
export class Money {
  private constructor(
    private readonly amount: number,
    private readonly currency: string,
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
    if (!currency) throw new Error('Currency is required');
  }

  static create(amount: number, currency: string): Money {
    return new Money(amount, currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  // Operations return new instances
  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Cannot add different currencies');
    }
    return Money.create(this.amount + other.amount, this.currency);
  }
}
```

## Domain Events

**Domain Events** represent something that happened in the domain that domain experts care about. They are a hybrid of Entities and Value Objects.

### Characteristics:

- **Identity**: Usually have an ID for tracking purposes
- **Immutable**: Once created, they cannot be changed
- **Timestamped**: Carry information about when the event occurred
- **Lifecycle**: Typically created once and never modified
- **Purpose**: Represent past events that have already occurred

### Examples in Teko Backend:

**UserRegisteredEvent** (`src/domain/events/user-registered.event.ts`):

- Represents that a user has been registered
- Contains: user information, timestamp
- Immutable: The event happened, it cannot be changed
- Used to trigger side effects (e.g., send welcome email, create wallet)

**EmailConfirmedEvent** (`src/domain/events/email-confirmed.event.ts`):

- Represents that a user confirmed their email
- Contains: user ID, confirmation timestamp
- Immutable record of a past event

**UserLoggedInEvent** (`src/domain/events/user-logged-in.event.ts`):

- Represents a user login
- Contains: user, session ID, timestamp
- Used for audit logging, analytics

### When to Use Domain Events:

- When something important happened in the domain
- When you need to trigger side effects in other bounded contexts
- When you need an audit trail of domain activities
- When you want to decouple domain logic from application logic

### Implementation Pattern:

```typescript
export class UserRegisteredEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly occurredAt: Date = new Date(),
  ) {}
}
```

## Aggregates

**Aggregates** are clusters of associated objects that we treat as a unit for the purpose of data changes. They help with decoupling of large structures by setting rules for relations between entities.

### Characteristics:

- **Aggregate Root**: One entity serves as the entry point (root) of the aggregate
- **Consistency Boundary**: All entities within an aggregate must be consistent
- **References**: External objects can only hold references to the aggregate root
- **Transaction Boundary**: Changes to an aggregate are atomic

### Examples in Teko Backend:

**User Aggregate**:

- **Root**: `User` entity
- **Contains**: User profile, preferences (could be value objects)
- **Rules**: All user-related data changes go through the User aggregate root
- **References**: Other aggregates (e.g., Session) reference User by ID, not by direct object reference

**Role Aggregate**:

- **Root**: `Role` entity
- **Contains**: Permissions (could be a collection of Permission entities or value objects)
- **Rules**: Permissions are managed through the Role aggregate root
- **References**: User references Role by ID

### Aggregate Rules:

1. **Only aggregate roots can be loaded from repositories**
2. **External objects can only hold references to aggregate roots** (by ID)
3. **All changes to entities within an aggregate must go through the root**
4. **Aggregates should be as small as possible** (keep them focused)

### When to Create Separate Aggregates:

- **Performance**: When loading the entire aggregate would be too expensive
  - Example: `HandlingEvent` in DDD sample is separate from `Cargo` aggregate because events are received frequently and loading the entire cargo would be too slow
- **Concurrency**: When different parts of the system need to modify different aggregates independently
- **Bounded Context**: When entities belong to different bounded contexts

## Repositories

**Repositories** work on aggregate roots. They provide a way to retrieve and persist aggregates.

### Characteristics:

- **One Repository per Aggregate Root**: Not per entity
- **Interface in Domain Layer**: Repository interfaces are part of the domain
- **Implementation in Infrastructure**: Concrete implementations are in the infrastructure layer
- **Return Aggregate Roots**: Methods return aggregate roots, not individual entities

### Examples in Teko Backend:

**UserRepository** (`src/application/identity/ports/user.repository.port.ts`):

- Works with `User` aggregate root
- Methods: `findById`, `findByEmail`, `create`, `update`, `remove`
- Returns `User` entities (aggregate roots)

**RoleRepository** (`src/application/authorization/ports/role.repository.port.ts`):

- Works with `Role` aggregate root
- Methods: `findById`, `findByName`, `findAll`
- Returns `Role` entities (aggregate roots)

### Repository Pattern:

```typescript
// Domain layer (interface)
export interface UserRepositoryPort {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, user: Partial<User>): Promise<User>;
  remove(id: string): Promise<void>;
}

// Infrastructure layer (implementation)
@Injectable()
export class TypeOrmUserRepository implements UserRepositoryPort {
  // Implementation using TypeORM
}
```

## Services

There are two basic kinds of services:

### Domain Services

**Domain Services** encapsulate domain concepts that are not naturally modeled as things (entities or value objects).

### Characteristics:

- **Domain Logic**: Contains business logic that doesn't fit in a single entity
- **Ubiquitous Language**: Expressed in terms of domain types
- **Interface in Domain**: Service interface is part of the domain layer
- **Implementation**: Can be in domain or infrastructure layer

### Examples in Teko Backend:

**LoginStrategyResolver** (`src/application/identity/factories/auth-strategy.factory.ts`):

- Resolves which login strategy to use
- Domain logic that doesn't belong to a single entity
- Works with domain types (User, LoginInput)

**PasswordHasher** (should be a domain service):

- Encapsulates password hashing logic
- Domain concept that doesn't fit in User entity
- Interface in domain, implementation in infrastructure

### When to Use Domain Services:

- When an operation doesn't conceptually belong to any entity or value object
- When the operation involves multiple entities
- When the operation is a significant business process

### Application Services

**Application Services** coordinate domain objects to perform application tasks. They orchestrate workflows and manage transactions.

### Characteristics:

- **Orchestration**: Coordinate domain objects to fulfill use cases
- **Transaction Management**: Handle transaction boundaries
- **Use Cases**: Each service method typically represents a use case
- **No Business Logic**: Should delegate to domain objects

### Examples in Teko Backend:

**LoginHandler** (`src/application/identity/handlers/login.handler.ts`):

- Orchestrates login process
- Coordinates: UserRepository, SessionRepository, TokenProvider
- Manages transaction
- Delegates business logic to domain services

**CreatePayinOrderHandler** (`src/application/payment/handlers/create-payin-order.handler.ts`):

- Orchestrates order creation
- Coordinates: PaymentApi, OrderRepository, UserRepository
- Manages transaction
- Delegates to domain objects

## Decision Tree

Use this decision tree to help classify your domain classes:

```
Is it something that happened? (past event)
├─ Yes → Domain Event
└─ No → Continue

Does it have a unique identity that persists?
├─ No → Value Object
└─ Yes → Continue

Does it have a meaningful lifecycle with state changes?
├─ No → Value Object (or Domain Event if it's a one-time thing)
└─ Yes → Entity

Is it the root of a cluster of related objects?
├─ Yes → Aggregate Root (Entity)
└─ No → Entity (part of an aggregate)

Does the operation involve multiple entities or not fit in any entity?
├─ Yes → Domain Service
└─ No → Method on Entity/Value Object
```

## Best Practices

1. **Favor Value Objects**: When in doubt, start with a Value Object. It's easier to promote to an Entity later than to demote.

2. **Keep Aggregates Small**: Aggregates should be as small as possible while maintaining consistency.

3. **Use Domain Events for Side Effects**: Don't put side effects in entity methods. Use domain events instead.

4. **Repository per Aggregate Root**: One repository per aggregate root, not per entity.

5. **Immutable Value Objects**: Value objects should always be immutable.

6. **Entities Have Identity**: If you're comparing by ID, it's an Entity. If you're comparing by value, it's a Value Object.

7. **Domain Events Are Past Tense**: Events represent things that have already happened (UserRegistered, OrderPlaced, etc.).

## References

- [DDD Sample Characterization](https://dddsample.sourceforge.net/characterization.html)
- Eric Evans, "Domain-Driven Design: Tackling Complexity in the Heart of Software"
- [Domain Events - Martin Fowler](http://martinfowler.com/eaaDev/DomainEvent.html)
