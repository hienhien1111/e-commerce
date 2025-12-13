---
to: src/application/<%= moduleName %>/queries/get-<%= nameKebabCase %>/get-<%= nameKebabCase %>.query.ts
---
import { IQuery } from '@nestjs/cqrs';

export class Get<%= name %>Query implements IQuery {
  constructor(public readonly id: string) {}
}
