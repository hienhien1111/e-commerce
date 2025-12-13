---
to: src/application/<%= moduleName %>/commands/delete-<%= nameKebabCase %>/delete-<%= nameKebabCase %>.command.ts
---
import { ICommand } from '@nestjs/cqrs';

export class Delete<%= name %>Command implements ICommand {
  constructor(public readonly id: string) {}
}
