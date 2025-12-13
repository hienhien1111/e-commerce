---
to: src/application/<%= moduleName %>/queries/get-<%= pluralKebabCase %>/get-<%= pluralKebabCase %>.query.ts
---
import { IQuery } from '@nestjs/cqrs';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { Filter<%= name %>Dto, Sort<%= name %>Dto } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';

export class Get<%= plural %>Query implements IQuery {
  constructor(
    public readonly filterOptions: Filter<%= name %>Dto | null,
    public readonly sortOptions: Sort<%= name %>Dto[] | null,
    public readonly paginationOptions: IPaginationOptions,
  ) {}
}
