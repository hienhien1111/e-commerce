import { IAggregateRoot } from './aggregate-root';

export abstract class BaseDomainModel<T> implements IAggregateRoot {
  protected props: T;
  protected readonly _id: string;
  protected readonly _createdAt: Date;
  protected _updatedAt: Date;

  protected constructor(
    props: T,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.props = props;
    this._id = id;
    this._createdAt = createdAt || new Date();
    this._updatedAt = updatedAt || new Date();
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

  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
