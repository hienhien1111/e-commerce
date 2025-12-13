---
to: src/application/<%= moduleName %>/queries/get-<%= pluralKebabCase %>/get-<%= pluralKebabCase %>.handler.ts
---
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Get<%= plural %>Query } from './get-<%= pluralKebabCase %>.query';
import { Get<%= plural %>Result } from './get-<%= pluralKebabCase %>.result';
import { <%= name %>RepositoryPort } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';

@QueryHandler(Get<%= plural %>Query)
export class Get<%= plural %>Handler implements IQueryHandler<Get<%= plural %>Query, Get<%= plural %>Result> {
  constructor(
    @Inject(<%= nameUpperCase %>_REPOSITORY_PORT)
    private readonly <%= nameCamelCase %>Repository: <%= name %>RepositoryPort,
  ) {}

  async execute(query: Get<%= plural %>Query): Promise<Get<%= plural %>Result> {
    const { filterOptions, sortOptions, paginationOptions } = query;

    const <%= pluralCamelCase %> = await this.<%= nameCamelCase %>Repository.findManyWithPagination({
      filterOptions,
      sortOptions,
      paginationOptions,
    });

    return { <%= pluralCamelCase %> };
  }
}
