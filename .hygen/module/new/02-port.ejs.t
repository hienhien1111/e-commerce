---
to: src/application/<%= name %>/ports/<%= h.changeCase.kebab(sampleEntity) %>/<%= h.changeCase.kebab(sampleEntity) %>.repository.port.ts
---
import { <%= sampleEntity %> } from '@/domain/entities/<%= h.changeCase.kebab(sampleEntity) %>';

export interface <%= sampleEntity %>RepositoryPort {
  findById(id: string): Promise<<%= sampleEntity %> | null>;
  save(entity: <%= sampleEntity %>): Promise<<%= sampleEntity %>>;
  remove(id: string): Promise<void>;
}
