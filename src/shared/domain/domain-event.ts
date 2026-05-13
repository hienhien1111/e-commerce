/**
 * Domain event base contract — plain TS, framework-free.
 *
 * Aggregates emit DomainEvent instances via `AggregateRoot.addDomainEvent()`.
 * Repositories pull them after persistence and forward to the application
 * event bus (or an outbox table for guaranteed delivery — Phase 5L).
 */
export interface DomainEvent {
  /** ISO-8601 timestamp the event occurred (defaults to now). */
  readonly occurredAt: Date;
}

export abstract class BaseDomainEvent implements DomainEvent {
  public readonly occurredAt: Date;

  protected constructor(occurredAt?: Date) {
    this.occurredAt = occurredAt ?? new Date();
  }
}
