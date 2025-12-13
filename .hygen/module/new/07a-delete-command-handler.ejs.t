---
to: src/application/<%= moduleName %>/commands/delete-<%= nameKebabCase %>/delete-<%= nameKebabCase %>.handler.ts
---
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Delete<%= name %>Command } from './delete-<%= nameKebabCase %>.command';
import { Delete<%= name %>Result } from './delete-<%= nameKebabCase %>.result';
import { <%= name %>RepositoryPort } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';

@CommandHandler(Delete<%= name %>Command)
export class Delete<%= name %>Handler implements ICommandHandler<Delete<%= name %>Command, Delete<%= name %>Result> {
  constructor(
    @Inject(<%= nameUpperCase %>_REPOSITORY_PORT)
    private readonly <%= nameCamelCase %>Repository: <%= name %>RepositoryPort,
  ) {}

  async execute(command: Delete<%= name %>Command): Promise<Delete<%= name %>Result> {
    const { id } = command;

    await this.<%= nameCamelCase %>Repository.remove(id);

    return { success: true };
  }
}
