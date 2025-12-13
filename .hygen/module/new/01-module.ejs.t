---
to: src/application/<%= moduleName %>/<%= moduleName %>.module.ts
unless_exists: true
---
import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
<% if (addToInfrastructure) { %>
import { TypeOrmModule } from '@nestjs/typeorm';
import { <%= name %>Entity } from '@/infrastructure/persistence/entities/<%= nameKebabCase %>.entity';
import { <%= name %>RepositoryImpl } from '@/infrastructure/persistence/repositories/<%= nameKebabCase %>.repository.impl';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from './ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';
<% } %>
<% if (addController) { %>
import { <%= name %>Controller } from '@/presentation/http/controllers/<%= nameKebabCase %>.controller';
<% } %>

import { Create<%= name %>Handler } from './commands/create-<%= nameKebabCase %>/create-<%= nameKebabCase %>.handler';
import { Update<%= name %>Handler } from './commands/update-<%= nameKebabCase %>/update-<%= nameKebabCase %>.handler';
import { Delete<%= name %>Handler } from './commands/delete-<%= nameKebabCase %>/delete-<%= nameKebabCase %>.handler';
import { Get<%= name %>Handler } from './queries/get-<%= nameKebabCase %>/get-<%= nameKebabCase %>.handler';
import { Get<%= plural %>Handler } from './queries/get-<%= pluralKebabCase %>/get-<%= pluralKebabCase %>.handler';

const CommandHandlers = [
  Create<%= name %>Handler,
  Update<%= name %>Handler,
  Delete<%= name %>Handler,
];

const QueryHandlers = [
  Get<%= name %>Handler,
  Get<%= plural %>Handler,
];

@Module({
  imports: [
    CqrsModule,
<% if (addToInfrastructure) { %>
    TypeOrmModule.forFeature([<%= name %>Entity]),
<% } %>
  ],
<% if (addController) { %>
  controllers: [<%= name %>Controller],
<% } %>
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
<% if (addToInfrastructure) { %>
    <%= name %>RepositoryImpl,
    {
      provide: <%= nameUpperCase %>_REPOSITORY_PORT,
      useExisting: <%= name %>RepositoryImpl,
    },
<% } %>
  ],
<% if (addToInfrastructure) { %>
  exports: [<%= nameUpperCase %>_REPOSITORY_PORT],
<% } %>
})
export class <%= moduleNamePascalCase %>Module {}
