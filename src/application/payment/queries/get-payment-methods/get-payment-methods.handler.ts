import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetPaymentMethodsQuery } from './get-payment-methods.query';
import { GetPaymentMethodsResult } from './get-payment-methods.result';
import type { TransfiApiPort } from '../../ports/transfi-api.port';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';

@QueryHandler(GetPaymentMethodsQuery)
export class GetPaymentMethodsHandler
  implements IQueryHandler<GetPaymentMethodsQuery>
{
  constructor(
    @Inject(TRANSFI_API_PORT)
    private readonly transfiApi: TransfiApiPort,
  ) {}

  async execute(
    query: GetPaymentMethodsQuery,
  ): Promise<GetPaymentMethodsResult> {
    return this.transfiApi.getPaymentMethods(
      query.currency,
      query.direction,
      query.page,
      query.limit,
      query.logoFormat,
    );
  }
}
