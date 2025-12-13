---
to: src/domain/index.ts
inject: true
skip_if: <%= nameKebabCase %>
after: "// Entities"
---
export * from './entities/<%= nameKebabCase %>';
