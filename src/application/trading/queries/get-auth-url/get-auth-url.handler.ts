import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetAuthUrlQuery } from './get-auth-url.query';
import { GetAuthUrlResult } from './get-auth-url.result';
import type { AlpacaApiPort } from '../../ports/alpaca-api.port';
import { ALPACA_API_PORT } from '../../ports/alpaca-api.port';

@QueryHandler(GetAuthUrlQuery)
export class GetAuthUrlHandler implements IQueryHandler<GetAuthUrlQuery> {
  constructor(
    @Inject(ALPACA_API_PORT)
    private readonly alpacaApi: AlpacaApiPort,
  ) {}

  async execute(_query: GetAuthUrlQuery): Promise<GetAuthUrlResult> {
    return this.alpacaApi.getAuthUrl();
  }
}
