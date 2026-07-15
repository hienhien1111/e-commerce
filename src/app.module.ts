import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';

import authConfig from './infrastructure/config/auth.config';
import webauthnConfig from './infrastructure/config/webauthn.config';
import appConfig from './config/app.config';
import googleOAuthConfig from './infrastructure/config/google-oauth.config';
import cloudinaryConfig from './infrastructure/config/cloudinary.config';
import momoConfig from './infrastructure/config/momo.config';
import type { AllConfigType } from './config/config.type';

import { LoggerModule } from './infrastructure/logger/logger.module';
import { MetricsModule } from './infrastructure/metrics/metrics.module';
import { PrismaModule } from './infrastructure/persistence/prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { IdentityModule } from './application/identity/identity.module';
import { AuthorizationModule } from './application/authorization/authorization.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        authConfig,
        webauthnConfig,
        appConfig,
        googleOAuthConfig,
        cloudinaryConfig,
        momoConfig,
      ],
      envFilePath: ['.env'],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => ({
        throttlers: [
          {
            ttl:
              configService.getOrThrow('app.throttleTtlMs', { infer: true }) ??
              seconds(60),
            limit: configService.getOrThrow('app.throttleLimit', {
              infer: true,
            }),
          },
        ],
      }),
    }),
    LoggerModule,
    MetricsModule,
    PrismaModule,
    HealthModule,
    IdentityModule,
    AuthorizationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
