---
to: src/application/<%= moduleName %>/queries/get-<%= nameKebabCase %>/get-<%= nameKebabCase %>.handler.ts
---
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Get<%= name %>Query } from './get-<%= nameKebabCase %>.query';
import { Get<%= name %>Result } from './get-<%= nameKebabCase %>.result';
import { <%= name %>RepositoryPort } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';

@QueryHandler(Get<%= name %>Query)
export class Get<%= name %>Handler implements IQueryHandler<Get<%= name %>Query, Get<%= name %>Result> {
  constructor(
    @Inject(<%= nameUpperCase %>_REPOSITORY_PORT)
    private readonly <%= nameCamelCase %>Repository: <%= name %>RepositoryPort,
  ) {}

  async execute(query: Get<%= name %>Query): Promise<Get<%= name %>Result> {
    const <%= nameCamelCase %> = await this.<%= nameCamelCase %>Repository.findById(query.id);

    return { <%= nameCamelCase %> };
  }
}
