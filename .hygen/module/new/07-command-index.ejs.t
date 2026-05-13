---
to: src/application/<%= name %>/commands/create-<%= h.changeCase.kebab(sampleEntity) %>/index.ts
---
export { Create<%= sampleEntity %>Command } from './create-<%= h.changeCase.kebab(sampleEntity) %>.command';
export { Create<%= sampleEntity %>Handler } from './create-<%= h.changeCase.kebab(sampleEntity) %>.handler';
