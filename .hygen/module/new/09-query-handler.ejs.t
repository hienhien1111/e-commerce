---
to: src/application/<%= name %>/queries/get-<%= h.changeCase.kebab(sampleEntity) %>/get-<%= h.changeCase.kebab(sampleEntity) %>.handler.ts
---
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject, NotFoundException } from '@nestjs/common';
import type { <%= sampleEntity %>RepositoryPort } from '../../ports/<%= h.changeCase.kebab(sampleEntity) %>/<%= h.changeCase.kebab(sampleEntity) %>.repository.port';
import { <%= h.changeCase.constant(sampleEntity) %>_REPOSITORY_PORT } from '../../ports/<%= h.changeCase.kebab(sampleEntity) %>/<%= h.changeCase.kebab(sampleEntity) %>.repository.port.token';
import { <%= sampleEntity %> } from '@/domain/entities/<%= h.changeCase.kebab(sampleEntity) %>';
import { Get<%= sampleEntity %>Query } from './get-<%= h.changeCase.kebab(sampleEntity) %>.query';

@QueryHandler(Get<%= sampleEntity %>Query)
export class Get<%= sampleEntity %>Handler
  implements IQueryHandler<Get<%= sampleEntity %>Query>
{
  constructor(
    @Inject(<%= h.changeCase.constant(sampleEntity) %>_REPOSITORY_PORT)
    private readonly repository: <%= sampleEntity %>RepositoryPort,
  ) {}

  async execute(query: Get<%= sampleEntity %>Query): Promise<<%= sampleEntity %>> {
    const entity = await this.repository.findById(query.id);
    if (!entity) {
      throw new NotFoundException(`<%= sampleEntity %> ${query.id} not found`);
    }
    return entity;
  }
}
