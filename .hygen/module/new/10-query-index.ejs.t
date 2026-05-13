---
to: src/application/<%= name %>/queries/get-<%= h.changeCase.kebab(sampleEntity) %>/index.ts
---
export { Get<%= sampleEntity %>Query } from './get-<%= h.changeCase.kebab(sampleEntity) %>.query';
export { Get<%= sampleEntity %>Handler } from './get-<%= h.changeCase.kebab(sampleEntity) %>.handler';
