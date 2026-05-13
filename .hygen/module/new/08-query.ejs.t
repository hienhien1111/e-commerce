---
to: src/application/<%= name %>/queries/get-<%= h.changeCase.kebab(sampleEntity) %>/get-<%= h.changeCase.kebab(sampleEntity) %>.query.ts
---
import { IQuery } from '@nestjs/cqrs';

export class Get<%= sampleEntity %>Query implements IQuery {
  constructor(public readonly id: string) {}
}
