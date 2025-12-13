---
to: src/application/<%= moduleName %>/commands/update-<%= nameKebabCase %>/update-<%= nameKebabCase %>.handler.ts
---
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import { Update<%= name %>Command } from './update-<%= nameKebabCase %>.command';
import { Update<%= name %>Result } from './update-<%= nameKebabCase %>.result';
import { <%= name %>RepositoryPort } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';

@CommandHandler(Update<%= name %>Command)
export class Update<%= name %>Handler implements ICommandHandler<Update<%= name %>Command, Update<%= name %>Result> {
  constructor(
    @Inject(<%= nameUpperCase %>_REPOSITORY_PORT)
    private readonly <%= nameCamelCase %>Repository: <%= name %>RepositoryPort,
  ) {}

  async execute(command: Update<%= name %>Command): Promise<Update<%= name %>Result> {
    const { id, payload } = command;

    const updated<%= name %> = await this.<%= nameCamelCase %>Repository.update(id, payload);

    if (!updated<%= name %>) {
      throw new NotFoundException(`<%= name %> with ID ${id} not found`);
    }

    return { <%= nameCamelCase %>: updated<%= name %> };
  }
}
