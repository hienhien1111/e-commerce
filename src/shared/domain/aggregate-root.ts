import type { DomainEvent } from './domain-event';

/**
 * Marker interface every aggregate root satisfies. Kept for backwards
 * compatibility with code that previously imported `IAggregateRoot`.
 */
export interface IAggregateRoot {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AggregateRoot — base class for DDD aggregate roots.
 *
 * Provides the in-memory domain event buffer. The `addDomainEvent()` method
 * is `protected` so only the aggregate (or its strategies) can emit events;
 * repositories use `pullDomainEvents()` after persistence to drain and
 * forward them.
 *
 * Concrete entities should extend `BaseDomainModel<TProps>` rather than this
 * class directly — that gives id/createdAt/updatedAt management for free.
 */
export abstract class AggregateRoot implements IAggregateRoot {
  protected readonly _id: string;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;
  private _domainEvents: DomainEvent[] = [];

  protected constructor(id: string, createdAt?: Date, updatedAt?: Date) {
    this._id = id;
    this._createdAt = createdAt ?? new Date();
    this._updatedAt = updatedAt ?? new Date();
  }

  get id(): string {
    return this._id;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  protected touch(): void {
    this._updatedAt = new Date();
  }

  /** Emit a domain event. Only callable from within the aggregate. */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /** Drain the event buffer. Repositories call this after persistence. */
  pullDomainEvents(): DomainEvent[] {
    const events = this._domainEvents;
    this._domainEvents = [];
    return events;
  }

  /** Inspect without draining (mostly for tests). */
  peekDomainEvents(): readonly DomainEvent[] {
    return this._domainEvents;
  }

  /** Discard pending events without dispatching. */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }
}
