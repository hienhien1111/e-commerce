---
to: src/application/<%= moduleName %>/queries/get-<%= pluralKebabCase %>/get-<%= pluralKebabCase %>.result.ts
---
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';

export interface Get<%= plural %>Result {
  <%= pluralCamelCase %>: <%= name %>[];
}
