import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import authConfig from './infrastructure/config/auth.config';
import webauthnConfig from './infrastructure/config/webauthn.config';
import appConfig from './config/app.config';

import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './application/identity/identity.module';
import { AuthorizationModule } from './application/authorization/authorization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [authConfig, webauthnConfig, appConfig],
      envFilePath: ['.env'],
    }),
    PrismaModule,
    HealthModule,
    IdentityModule,
    AuthorizationModule,
  ],
})
export class AppModule {}
