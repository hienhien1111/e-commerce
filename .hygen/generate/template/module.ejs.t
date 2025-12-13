---
to: src/application/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.module.ts
---
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';
import { <%= name %>Entity } from '@/infrastructure/persistence/entities/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.entity';
import { <%= name %>RepositoryImpl } from '@/infrastructure/persistence/repositories/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.repository.impl';
import { <%= name.toUpperCase() %>_REPOSITORY_PORT } from './ports/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.repository.port.token';
import { <%= name %>Controller } from '@/presentation/http/controllers/<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.controller';

import { Create<%= name %>Handler } from './commands/create-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/create-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.handler';
import { Update<%= name %>Handler } from './commands/update-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/update-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.handler';
import { Delete<%= name %>Handler } from './commands/delete-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/delete-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.handler';
import { Get<%= name %>Handler } from './queries/get-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>/get-<%= h.inflection.transform(name, ['underscore', 'dasherize']) %>.handler';
import { Get<%= h.inflection.transform(name, ['pluralize']) %>Handler } from './queries/get-<%= h.inflection.transform(name, ['pluralize', 'underscore', 'dasherize']) %>/get-<%= h.inflection.transform(name, ['pluralize', 'underscore', 'dasherize']) %>.handler';

const CommandHandlers = [
  Create<%= name %>Handler,
  Update<%= name %>Handler,
  Delete<%= name %>Handler,
];

const QueryHandlers = [
  Get<%= name %>Handler,
  Get<%= h.inflection.transform(name, ['pluralize']) %>Handler,
];

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([<%= name %>Entity]),
  ],
  controllers: [<%= name %>Controller],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    <%= name %>RepositoryImpl,
    {
      provide: <%= name.toUpperCase() %>_REPOSITORY_PORT,
      useExisting: <%= name %>RepositoryImpl,
    },
  ],
  exports: [<%= name.toUpperCase() %>_REPOSITORY_PORT],
})
export class <%= name %>Module {}
