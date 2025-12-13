import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { User } from '@/domain/entities/user';

export interface SessionEssentialProps {
  user: User;
  hash: string;
}

type SessionInternalProps = SessionEssentialProps;

export class Session extends BaseDomainModel<SessionInternalProps> {
  private _deletedAt?: Date;

  private constructor(
    props: SessionInternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date,
  ) {
    super(props, id, createdAt, updatedAt);
    this._deletedAt = deletedAt;
    this.validate();
  }

  static _create(
    props: SessionInternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date,
  ): Session {
    return new Session(props, id, createdAt, updatedAt, deletedAt);
  }

  get deletedAt(): Date | undefined {
    return this._deletedAt;
  }

  private validate(): void {
    if (!this.props.user) {
      throw new Error('Session user is required');
    }
    if (!this.props.hash || this.props.hash.trim().length === 0) {
      throw new Error('Session hash is required');
    }
  }

  get user(): SessionEssentialProps['user'] {
    return this.props.user;
  }

  get hash(): SessionEssentialProps['hash'] {
    return this.props.hash;
  }

  updateHash(hash: NonNullable<SessionEssentialProps['hash']>): void {
    this.props.hash = hash;
    this.touch();
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      user: this.user.toJSON(),
      hash: this.hash,
      deletedAt: this.deletedAt ?? null,
    };
  }
}
