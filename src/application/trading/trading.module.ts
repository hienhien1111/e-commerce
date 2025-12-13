import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';

import { AlpacaStreamGateway } from '@/presentation/websocket/alpaca-stream.gateway';

import { AlpacaHttpAdapter } from '@/infrastructure/adapters/alpaca-http.adapter';
import { AlpacaApiAdapter } from '@/infrastructure/adapters/alpaca-api.adapter';
import { AlpacaWsClientService } from '@/infrastructure/websocket/alpaca-ws-client.service';
import { TypeOrmTradingTokenRepository } from '@/infrastructure/persistence/repositories/trading-token.repository';
import { TradingTokenEntity } from '@/infrastructure/persistence/entities/trading-token.entity';

import { GetPositionsHandler } from '@/application/trading/queries/get-positions';
import { GetPositionBySymbolHandler } from '@/application/trading/queries/get-position-by-symbol';
import { GetAccountHandler } from '@/application/trading/queries/get-account';
import { GetAuthUrlHandler } from '@/application/trading/queries/get-auth-url';
import { ExchangeTokenHandler } from '@/application/trading/commands/exchange-token';

import { ALPACA_API_PORT } from '@/application/trading/ports/alpaca-api.port';
import { ALPACA_TOKEN_REPOSITORY } from '@/application/trading/ports/alpaca-token.repository';

const QueryHandlers = [
  GetPositionsHandler,
  GetPositionBySymbolHandler,
  GetAccountHandler,
  GetAuthUrlHandler,
];

const CommandHandlers = [ExchangeTokenHandler];

@Module({
  imports: [
    CqrsModule,
    HttpModule,
    ConfigModule,
    TypeOrmModule.forFeature([TradingTokenEntity]),
    EventEmitterModule.forRoot(),
    JwtModule.register({}),
  ],
  controllers: [],
  providers: [
    AlpacaHttpAdapter,
    AlpacaApiAdapter,
    AlpacaWsClientService,
    AlpacaStreamGateway,
    TypeOrmTradingTokenRepository,

    ...QueryHandlers,
    ...CommandHandlers,

    {
      provide: ALPACA_API_PORT,
      useExisting: AlpacaApiAdapter,
    },
    {
      provide: ALPACA_TOKEN_REPOSITORY,
      useExisting: TypeOrmTradingTokenRepository,
    },
  ],
  exports: [ALPACA_API_PORT],
})
export class TradingModule {}
