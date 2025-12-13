---
to: src/application/<%= moduleName %>/commands/create-<%= nameKebabCase %>/create-<%= nameKebabCase %>.command.ts
---
import { ICommand } from '@nestjs/cqrs';

export interface Create<%= name %>Payload {
  name: string;
}

export class Create<%= name %>Command implements ICommand {
  constructor(public readonly payload: Create<%= name %>Payload) {}
}
