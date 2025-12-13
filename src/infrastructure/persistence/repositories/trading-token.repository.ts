import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradingToken } from '@/domain/entities/trading-token';
import type { TradingTokenRepositoryPort } from '@/application/trading/ports/alpaca-token.repository';
import { TradingTokenEntity } from '@/infrastructure/persistence/entities/trading-token.entity';
import { TradingTokenMapper } from '@/infrastructure/persistence/mappers/trading-token.mapper';

@Injectable()
export class TypeOrmTradingTokenRepository
  implements TradingTokenRepositoryPort
{
  constructor(
    @InjectRepository(TradingTokenEntity)
    private readonly repo: Repository<TradingTokenEntity>,
  ) {}

  async save(token: TradingToken): Promise<TradingToken> {
    const entity = TradingTokenMapper.toPersistence(token);
    const saved = await this.repo.save(entity);
    return TradingTokenMapper.toDomain(saved);
  }

  async findByUserId(userId: string): Promise<TradingToken | null> {
    const entity = await this.repo.findOne({ where: { userId } });
    return entity ? TradingTokenMapper.toDomain(entity) : null;
  }

  async findByAccountId(accountId: string): Promise<TradingToken | null> {
    const entity = await this.repo.findOne({ where: { accountId } });
    return entity ? TradingTokenMapper.toDomain(entity) : null;
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }
}
