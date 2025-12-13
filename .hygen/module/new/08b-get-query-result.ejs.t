---
to: src/application/<%= moduleName %>/queries/get-<%= nameKebabCase %>/get-<%= nameKebabCase %>.result.ts
---
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';
import { NullableType } from '@/utils/types/nullable.type';

export interface Get<%= name %>Result {
  <%= nameCamelCase %>: NullableType<<%= name %>>;
}
