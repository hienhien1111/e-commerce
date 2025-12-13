---
to: src/application/<%= moduleName %>/commands/update-<%= nameKebabCase %>/update-<%= nameKebabCase %>.command.ts
---
import { ICommand } from '@nestjs/cqrs';
import { DeepPartial } from '@/utils/types/deep-partial.type';
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';

export type Update<%= name %>Payload = DeepPartial<Omit<<%= name %>, 'id' | 'createdAt'>>;

export class Update<%= name %>Command implements ICommand {
  constructor(
    public readonly id: string,
    public readonly payload: Update<%= name %>Payload,
  ) {}
}
