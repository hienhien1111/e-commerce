import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { useContainer } from 'class-validator';
import { ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppModule } from '@/app.module';
import validationOptions from '@/utils/validation-options';
import { ResolvePromisesInterceptor } from '@/utils/serializer.interceptor';
import { SerializeToJSONInterceptor } from '@/utils/serialize-to-json.interceptor';

/**
 * Creates and initialises a full NestJS application for E2E testing.
 * Mirrors the setup in main.ts (pipes, interceptors, versioning, prefix).
 */
export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  useContainer(app.select(AppModule), { fallbackOnErrors: true });

  app.setGlobalPrefix('api', { exclude: ['/'] });
  app.enableVersioning({ type: VersioningType.URI });
  app.useGlobalPipes(new ValidationPipe(validationOptions));
  app.useGlobalInterceptors(
    new ResolvePromisesInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
    new SerializeToJSONInterceptor(),
  );

  await app.init();
  return app;
}
