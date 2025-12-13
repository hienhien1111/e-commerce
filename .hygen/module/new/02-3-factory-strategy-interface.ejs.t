---
to: src/domain/services/<%= nameKebabCase %>-creation.strategy.ts
skip_if: <%= addToDomain ? false : true %>
---
import { <%= name %> } from '../entities/<%= nameKebabCase %>';

export interface Create<%= name %>Input {
  name: string;
}

export interface Reconstitute<%= name %>Input {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface <%= name %>CreationStrategy<T> {
  execute(input: T): <%= name %>;
}
