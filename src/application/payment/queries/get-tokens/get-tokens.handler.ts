import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetTokensQuery } from './get-tokens.query';
import { GetTokensResult } from './get-tokens.result';
import type { TransfiApiPort } from '../../ports/transfi-api.port';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';

@QueryHandler(GetTokensQuery)
export class GetTokensHandler implements IQueryHandler<GetTokensQuery> {
  constructor(
    @Inject(TRANSFI_API_PORT)
    private readonly transfiApi: TransfiApiPort,
  ) {}

  async execute(query: GetTokensQuery): Promise<GetTokensResult> {
    return this.transfiApi.getTokens(query.direction);
  }
}
