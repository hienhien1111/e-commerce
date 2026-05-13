import { AggregateRoot } from './aggregate-root';

/**
 * BaseDomainModel — generic container for an aggregate's invariant props.
 *
 * Extends `AggregateRoot` so every domain entity inherits domain-event
 * buffering plus id/createdAt/updatedAt management.
 */
export abstract class BaseDomainModel<T> extends AggregateRoot {
  protected props: T;

  protected constructor(
    props: T,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.props = props;
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
