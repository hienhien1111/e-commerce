import { BaseDomainModel } from '@/shared/domain/base-domain-model';

export interface TradingTokenProps {
  accessToken: string;
  tokenType?: string;
  scope?: string;
  userId: string;
  accountId?: string;
}

export class TradingToken extends BaseDomainModel<TradingTokenProps> {
  constructor(
    props: TradingTokenProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(props, id, createdAt, updatedAt);
  }

  static create(
    props: TradingTokenProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ): TradingToken {
    return new TradingToken(props, id, createdAt, updatedAt);
  }

  get accessToken(): string {
    return this.props.accessToken;
  }

  get tokenType(): string | undefined {
    return this.props.tokenType;
  }

  get scope(): string | undefined {
    return this.props.scope;
  }

  get userId(): string {
    return this.props.userId;
  }

  get accountId(): string | undefined {
    return this.props.accountId;
  }
}
