import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetPositionsQuery } from './get-positions.query';
import { GetPositionsResult } from './get-positions.result';
import type { AlpacaApiPort } from '../../ports/alpaca-api.port';
import { ALPACA_API_PORT } from '../../ports/alpaca-api.port';
import type { TradingTokenRepositoryPort } from '../../ports/alpaca-token.repository';
import { ALPACA_TOKEN_REPOSITORY } from '../../ports/alpaca-token.repository';

@QueryHandler(GetPositionsQuery)
export class GetPositionsHandler implements IQueryHandler<GetPositionsQuery> {
  constructor(
    @Inject(ALPACA_API_PORT)
    private readonly alpacaApi: AlpacaApiPort,
    @Inject(ALPACA_TOKEN_REPOSITORY)
    private readonly tokenRepository: TradingTokenRepositoryPort,
  ) {}

  async execute(query: GetPositionsQuery): Promise<GetPositionsResult> {
    const token = await this.tokenRepository.findByUserId(query.userId);
    if (!token) {
      throw new NotFoundException('Alpaca token not found for user');
    }
    return this.alpacaApi.getPositions(token.accessToken);
  }
}
