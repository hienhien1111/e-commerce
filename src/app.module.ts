import { Module } from '@nestjs/common';
import databaseConfig from './database/config/database.config';
import authConfig from './infrastructure/config/auth.config';
import webauthnConfig from './infrastructure/config/webauthn.config';
import alpacaConfig from './infrastructure/config/alpaca.config';
import appConfig from './config/app.config';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmConfigService } from './database/config.service';
import { DataSource, DataSourceOptions } from 'typeorm';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './application/identity/identity.module';
import { AuthorizationModule } from './application/authorization/authorization.module';
import { TradingModule } from './application/trading/trading.module';
import { PaymentModule } from './application/payment/payment.module';

const infrastructureDatabaseModule = TypeOrmModule.forRootAsync({
  useClass: TypeOrmConfigService,
  dataSourceFactory: async (options: DataSourceOptions) => {
    return new DataSource(options).initialize();
  },
});

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        authConfig,
        webauthnConfig,
        alpacaConfig,
        appConfig,
      ],
      envFilePath: ['.env'],
    }),
    infrastructureDatabaseModule,
    HealthModule,
    IdentityModule,
    AuthorizationModule,
    TradingModule,
    PaymentModule,
  ],
})
export class AppModule {}
