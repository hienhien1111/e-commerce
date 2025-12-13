import { TradingToken } from '@/domain/entities/trading-token';
import { TradingTokenEntity } from '@/infrastructure/persistence/entities/trading-token.entity';

export class TradingTokenMapper {
  static toDomain(raw: TradingTokenEntity): TradingToken {
    return TradingToken.create(
      {
        accessToken: raw.accessToken,
        tokenType: raw.tokenType ?? undefined,
        scope: raw.scope ?? undefined,
        userId: raw.userId,
        accountId: raw.accountId ?? undefined,
      },
      raw.id,
      raw.createdAt,
      raw.updatedAt,
    );
  }

  static toPersistence(domainEntity: TradingToken): TradingTokenEntity {
    const entity = new TradingTokenEntity();
    entity.id = domainEntity.id;
    entity.userId = domainEntity.userId;
    entity.accessToken = domainEntity.accessToken;
    entity.tokenType = domainEntity.tokenType ?? null;
    entity.scope = domainEntity.scope ?? null;
    entity.accountId = domainEntity.accountId ?? null;
    entity.createdAt = domainEntity.createdAt;
    entity.updatedAt = domainEntity.updatedAt;
    return entity;
  }
}
