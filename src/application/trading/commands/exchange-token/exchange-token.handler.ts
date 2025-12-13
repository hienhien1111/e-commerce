import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ExchangeTokenCommand } from './exchange-token.command';
import { ExchangeTokenResult } from './exchange-token.result';
import type { AlpacaApiPort } from '../../ports/alpaca-api.port';
import { ALPACA_API_PORT } from '../../ports/alpaca-api.port';
import type { TradingTokenRepositoryPort } from '../../ports/alpaca-token.repository';
import { ALPACA_TOKEN_REPOSITORY } from '../../ports/alpaca-token.repository';
import { TradingToken } from '@/domain/entities/trading-token';
import { generateUuidV7 } from '@/utils/uuid-v7';

@CommandHandler(ExchangeTokenCommand)
export class ExchangeTokenHandler
  implements ICommandHandler<ExchangeTokenCommand>
{
  constructor(
    @Inject(ALPACA_API_PORT)
    private readonly alpacaApi: AlpacaApiPort,
    @Inject(ALPACA_TOKEN_REPOSITORY)
    private readonly tokenRepository: TradingTokenRepositoryPort,
  ) {}

  async execute(command: ExchangeTokenCommand): Promise<ExchangeTokenResult> {
    const tokenResponse = await this.alpacaApi.exchangeCodeForToken(
      command.code,
    );

    const accountInfo = await this.alpacaApi.getAccount(
      tokenResponse.access_token,
    );

    const alpacaToken = TradingToken.create(
      {
        accessToken: tokenResponse.access_token,
        tokenType: tokenResponse.token_type,
        scope: tokenResponse.scope,
        userId: command.userId,
        accountId: accountInfo.id,
      },
      generateUuidV7(),
    );

    await this.tokenRepository.save(alpacaToken);
  }
}
