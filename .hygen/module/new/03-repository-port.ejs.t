---
to: src/application/<%= moduleName %>/ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.ts
---
import { NullableType } from '@/utils/types/nullable.type';
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';
import { DeepPartial } from '@/utils/types/deep-partial.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';

export interface Filter<%= name %>Dto {
  name?: string;
}

export interface Sort<%= name %>Dto {
  orderBy: keyof <%= name %>;
  order: 'ASC' | 'DESC';
}

export interface <%= name %>RepositoryPort {
  findManyWithPagination(params: {
    filterOptions?: Filter<%= name %>Dto | null;
    sortOptions?: Sort<%= name %>Dto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<<%= name %>[]>;

  findById(id: <%= name %>['id']): Promise<NullableType<<%= name %>>>;

  create(data: <%= name %>): Promise<<%= name %>>;

  update(
    id: <%= name %>['id'],
    payload: DeepPartial<Omit<<%= name %>, 'id' | 'createdAt'>>,
  ): Promise<<%= name %> | null>;

  remove(id: <%= name %>['id']): Promise<void>;
}
