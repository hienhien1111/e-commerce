import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetPositionBySymbolQuery } from './get-position-by-symbol.query';
import { GetPositionBySymbolResult } from './get-position-by-symbol.result';
import type { AlpacaApiPort } from '../../ports/alpaca-api.port';
import { ALPACA_API_PORT } from '../../ports/alpaca-api.port';
import type { TradingTokenRepositoryPort } from '../../ports/alpaca-token.repository';
import { ALPACA_TOKEN_REPOSITORY } from '../../ports/alpaca-token.repository';

@QueryHandler(GetPositionBySymbolQuery)
export class GetPositionBySymbolHandler
  implements IQueryHandler<GetPositionBySymbolQuery>
{
  constructor(
    @Inject(ALPACA_API_PORT)
    private readonly alpacaApi: AlpacaApiPort,
    @Inject(ALPACA_TOKEN_REPOSITORY)
    private readonly tokenRepository: TradingTokenRepositoryPort,
  ) {}

  async execute(
    query: GetPositionBySymbolQuery,
  ): Promise<GetPositionBySymbolResult> {
    const token = await this.tokenRepository.findByUserId(query.userId);
    if (!token) {
      throw new NotFoundException('Alpaca token not found for user');
    }
    return this.alpacaApi.getPositionBySymbol(token.accessToken, query.symbol);
  }
}
