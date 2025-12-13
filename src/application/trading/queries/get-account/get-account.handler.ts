import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { GetAccountQuery } from './get-account.query';
import { GetAccountResult } from './get-account.result';
import type { AlpacaApiPort } from '../../ports/alpaca-api.port';
import { ALPACA_API_PORT } from '../../ports/alpaca-api.port';
import type { TradingTokenRepositoryPort } from '../../ports/alpaca-token.repository';
import { ALPACA_TOKEN_REPOSITORY } from '../../ports/alpaca-token.repository';

@QueryHandler(GetAccountQuery)
export class GetAccountHandler implements IQueryHandler<GetAccountQuery> {
  constructor(
    @Inject(ALPACA_API_PORT)
    private readonly alpacaApi: AlpacaApiPort,
    @Inject(ALPACA_TOKEN_REPOSITORY)
    private readonly tokenRepository: TradingTokenRepositoryPort,
  ) {}

  async execute(query: GetAccountQuery): Promise<GetAccountResult> {
    const token = await this.tokenRepository.findByUserId(query.userId);
    if (!token) {
      throw new NotFoundException('Alpaca token not found for user');
    }
    return this.alpacaApi.getAccount(token.accessToken);
  }
}
