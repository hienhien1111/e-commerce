import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetCurrenciesQuery } from './get-currencies.query';
import { GetCurrenciesResult } from './get-currencies.result';
import type { TransfiApiPort } from '../../ports/transfi-api.port';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';

@QueryHandler(GetCurrenciesQuery)
export class GetCurrenciesHandler implements IQueryHandler<GetCurrenciesQuery> {
  constructor(
    @Inject(TRANSFI_API_PORT)
    private readonly transfiApi: TransfiApiPort,
  ) {}

  async execute(query: GetCurrenciesQuery): Promise<GetCurrenciesResult> {
    return this.transfiApi.getCurrencies(
      query.direction,
      query.page,
      query.limit,
    );
  }
}
