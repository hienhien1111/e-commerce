---
to: src/application/<%= name %>/<%= name %>.module.ts
---
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { <%= h.changeCase.pascal(name) %>Controller } from '@/presentation/http/controllers/<%= name %>.controller';

import { Prisma<%= sampleEntity %>Repository } from '@/infrastructure/persistence/repositories/prisma-<%= h.changeCase.kebab(sampleEntity) %>.repository';

import { Create<%= sampleEntity %>Handler } from '@/application/<%= name %>/commands/create-<%= h.changeCase.kebab(sampleEntity) %>';
import { Get<%= sampleEntity %>Handler } from '@/application/<%= name %>/queries/get-<%= h.changeCase.kebab(sampleEntity) %>';

import { <%= h.changeCase.constant(sampleEntity) %>_REPOSITORY_PORT } from '@/application/<%= name %>/ports/<%= h.changeCase.kebab(sampleEntity) %>/<%= h.changeCase.kebab(sampleEntity) %>.repository.port.token';

const CommandHandlers = [Create<%= sampleEntity %>Handler];
const QueryHandlers = [Get<%= sampleEntity %>Handler];

@Module({
  imports: [CqrsModule],
  controllers: [<%= h.changeCase.pascal(name) %>Controller],
  providers: [
    Prisma<%= sampleEntity %>Repository,
    ...CommandHandlers,
    ...QueryHandlers,
    {
      provide: <%= h.changeCase.constant(sampleEntity) %>_REPOSITORY_PORT,
      useExisting: Prisma<%= sampleEntity %>Repository,
    },
  ],
  exports: [<%= h.changeCase.constant(sampleEntity) %>_REPOSITORY_PORT],
})
export class <%= h.changeCase.pascal(name) %>Module {}
