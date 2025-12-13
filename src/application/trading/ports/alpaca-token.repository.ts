import { TradingToken } from '@/domain/entities/trading-token';

export interface TradingTokenRepositoryPort {
  save(token: TradingToken): Promise<TradingToken>;
  findByUserId(userId: string): Promise<TradingToken | null>;
  findByAccountId(accountId: string): Promise<TradingToken | null>;
  deleteByUserId(userId: string): Promise<void>;
}

export const ALPACA_TOKEN_REPOSITORY = Symbol('ALPACA_TOKEN_REPOSITORY');
