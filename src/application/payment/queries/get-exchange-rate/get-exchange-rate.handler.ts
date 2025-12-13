import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetExchangeRateQuery } from './get-exchange-rate.query';
import { GetExchangeRateResult } from './get-exchange-rate.result';
import type { TransfiApiPort } from '../../ports/transfi-api.port';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';

@QueryHandler(GetExchangeRateQuery)
export class GetExchangeRateHandler
  implements IQueryHandler<GetExchangeRateQuery>
{
  constructor(
    @Inject(TRANSFI_API_PORT)
    private readonly transfiApi: TransfiApiPort,
  ) {}

  async execute(query: GetExchangeRateQuery): Promise<GetExchangeRateResult> {
    return this.transfiApi.getExchangeRate(query.dto);
  }
}
