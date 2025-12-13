---
to: src/domain/factories/<%= nameKebabCase %>-creation-type.enum.ts
skip_if: <%= addToDomain ? false : true %>
---
export enum <%= name %>CreationType {
  BASIC = 'BASIC',
  RECONSTITUTE = 'RECONSTITUTE',
}
