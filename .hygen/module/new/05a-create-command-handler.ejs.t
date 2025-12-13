---
to: src/application/<%= moduleName %>/commands/create-<%= nameKebabCase %>/create-<%= nameKebabCase %>.handler.ts
---
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { Create<%= name %>Command } from './create-<%= nameKebabCase %>.command';
import { Create<%= name %>Result } from './create-<%= nameKebabCase %>.result';
import { <%= name %> } from '@/domain/entities/<%= nameKebabCase %>';
import { <%= name %>RepositoryPort } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port';
import { <%= nameUpperCase %>_REPOSITORY_PORT } from '../../ports/<%= nameKebabCase %>/<%= nameKebabCase %>.repository.port.token';
import { <%= name %>Factory } from '@/domain/factories/<%= nameKebabCase %>.factory';

@CommandHandler(Create<%= name %>Command)
export class Create<%= name %>Handler implements ICommandHandler<Create<%= name %>Command, Create<%= name %>Result> {
  constructor(
    @Inject(<%= nameUpperCase %>_REPOSITORY_PORT)
    private readonly <%= nameCamelCase %>Repository: <%= name %>RepositoryPort,
  ) {}

  async execute(command: Create<%= name %>Command): Promise<Create<%= name %>Result> {
    const { payload } = command;

    const <%= nameCamelCase %> = <%= name %>Factory.create({
      name: payload.name,
    });

    const saved<%= name %> = await this.<%= nameCamelCase %>Repository.create(<%= nameCamelCase %>);

    return { <%= nameCamelCase %>: saved<%= name %> };
  }
}
