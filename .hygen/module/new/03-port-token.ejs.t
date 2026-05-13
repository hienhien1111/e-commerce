---
to: src/application/<%= name %>/ports/<%= h.changeCase.kebab(sampleEntity) %>/<%= h.changeCase.kebab(sampleEntity) %>.repository.port.token.ts
---
export const <%= h.changeCase.constant(sampleEntity) %>_REPOSITORY_PORT = Symbol(
  '<%= sampleEntity %>RepositoryPort',
);
