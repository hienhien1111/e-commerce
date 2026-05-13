---
to: src/application/<%= name %>/commands/create-<%= h.changeCase.kebab(sampleEntity) %>/create-<%= h.changeCase.kebab(sampleEntity) %>.command.ts
---
import { ICommand } from '@nestjs/cqrs';

export interface Create<%= sampleEntity %>Payload {
  name: string;
}

export class Create<%= sampleEntity %>Command implements ICommand {
  constructor(public readonly payload: Create<%= sampleEntity %>Payload) {}
}
