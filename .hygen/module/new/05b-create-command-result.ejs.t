---
to: src/application/<%= moduleName %>/commands/create-<%= nameKebabCase %>/create-<%= nameKebabCase %>.result.ts
---
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';

export interface Create<%= name %>Result {
  <%= nameCamelCase %>: <%= name %>;
}
