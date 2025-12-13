---
to: src/application/<%= moduleName %>/README.md
unless_exists: true
---
# <%= moduleNamePascalCase %> Module

This module handles <%= moduleName %>-related functionality.

## Structure

```
<%= moduleName %>/
├── <%= moduleName %>.module.ts      # Module definition
├── commands/                        # Write operations (CQRS)
│   ├── create-<%= nameKebabCase %>/
│   ├── update-<%= nameKebabCase %>/
│   └── delete-<%= nameKebabCase %>/
├── queries/                         # Read operations (CQRS)
│   ├── get-<%= nameKebabCase %>/
│   └── get-<%= pluralKebabCase %>/
└── ports/                           # Port interfaces
    └── <%= nameKebabCase %>/
        ├── <%= nameKebabCase %>.repository.port.ts
        └── <%= nameKebabCase %>.repository.port.token.ts
```

## Entities

- `<%= name %>`: <%= name %> domain entity

## Usage

### Create <%= name %>

```typescript
const result = await commandBus.execute(
  new Create<%= name %>Command({ name: 'Sample' }),
);
```

### Get <%= name %>

```typescript
const result = await queryBus.execute(new Get<%= name %>Query(id));
```

### Get All <%= plural %>

```typescript
const result = await queryBus.execute(
  new Get<%= plural %>Query(null, null, { cursor: null, limit: 10 }),
);
```

### Update <%= name %>

```typescript
const result = await commandBus.execute(
  new Update<%= name %>Command(id, { name: 'Updated' }),
);
```

### Delete <%= name %>

```typescript
await commandBus.execute(new Delete<%= name %>Command(id));
```
