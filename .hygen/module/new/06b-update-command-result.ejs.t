---
to: src/application/<%= moduleName %>/commands/update-<%= nameKebabCase %>/update-<%= nameKebabCase %>.result.ts
---
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';

export interface Update<%= name %>Result {
  <%= nameCamelCase %>: <%= name %>;
}
