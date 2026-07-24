// IMPORTANT: tracing must be the very first import — OTel instruments
// libraries at require time, so it has to run before NestJS pulls them in.
import './tracing';

import {
  ClassSerializerInterceptor,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useContainer } from 'class-validator';
import helmet from 'helmet';
import { Logger as PinoLogger } from 'nestjs-pino';
import { AppModule } from './app.module';
import validationOptions from './utils/validation-options';
import { AllConfigType } from './config/config.type';
import { validateEnv } from './config/env.schema';
import { ResolvePromisesInterceptor } from './utils/serializer.interceptor';
import { SerializeToJSONInterceptor } from './utils/serialize-to-json.interceptor';
import { ApplicationErrorFilter } from './presentation/http/filters/application-error.filter';

async function bootstrap() {
  validateEnv();
  const app = await NestFactory.create(AppModule, {
    cors: false,
    bufferLogs: true,
  });
  app.useLogger(app.get(PinoLogger));
  useContainer(app.select(AppModule), { fallbackOnErrors: true });
  const configService = app.get(ConfigService<AllConfigType>);

  const corsOrigins = configService.getOrThrow('app.corsOrigins', {
    infer: true,
  });
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.use(helmet());

  app.enableShutdownHooks();
  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: ['/'],
    },
  );
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalFilters(new ApplicationErrorFilter());
  app.useGlobalInterceptors(
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
    new SerializeToJSONInterceptor(),
  );

  const options = new DocumentBuilder()
    .setTitle('Ecommerce Catalog API')
    .setDescription(
      'Catalog v2 is the canonical Product/Variant contract: options, product-owned media, immutable SKU, inventory ledger/reservations, and projection-backed storefront queries. API v1 remains available only as a temporary legacy bridge during cutover.',
    )
    .setVersion('2.0.0')
    .addCookieAuth(
      'access_token',
      { type: 'apiKey', in: 'cookie', name: 'access_token' },
      'access_token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('docs', app, document, {
    useGlobalPrefix: true,
  });

  await app.listen(configService.getOrThrow('app.port', { infer: true }));
}
void bootstrap();
