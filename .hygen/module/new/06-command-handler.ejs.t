---
to: src/application/<%= name %>/commands/create-<%= h.changeCase.kebab(sampleEntity) %>/create-<%= h.changeCase.kebab(sampleEntity) %>.handler.ts
---
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { v7 as uuidv7 } from 'uuid';
import type { <%= sampleEntity %>RepositoryPort } from '../../ports/<%= h.changeCase.kebab(sampleEntity) %>/<%= h.changeCase.kebab(sampleEntity) %>.repository.port';
import { <%= h.changeCase.constant(sampleEntity) %>_REPOSITORY_PORT } from '../../ports/<%= h.changeCase.kebab(sampleEntity) %>/<%= h.changeCase.kebab(sampleEntity) %>.repository.port.token';
import { <%= sampleEntity %> } from '@/domain/entities/<%= h.changeCase.kebab(sampleEntity) %>';
import { Create<%= sampleEntity %>Command } from './create-<%= h.changeCase.kebab(sampleEntity) %>.command';

@CommandHandler(Create<%= sampleEntity %>Command)
export class Create<%= sampleEntity %>Handler
  implements ICommandHandler<Create<%= sampleEntity %>Command>
{
  constructor(
    @Inject(<%= h.changeCase.constant(sampleEntity) %>_REPOSITORY_PORT)
    private readonly repository: <%= sampleEntity %>RepositoryPort,
  ) {}

  async execute(command: Create<%= sampleEntity %>Command): Promise<<%= sampleEntity %>> {
    const entity = <%= sampleEntity %>.create(
      { name: command.payload.name },
      uuidv7(),
    );
    return this.repository.save(entity);
  }
}
