---
to: src/domain/services/reconstitute-<%= nameKebabCase %>.strategy.ts
skip_if: <%= addToDomain ? false : true %>
---
import { <%= name %> } from '../entities/<%= nameKebabCase %>';
import { <%= name %>CreationStrategy, Reconstitute<%= name %>Input } from './<%= nameKebabCase %>-creation.strategy';

export class Reconstitute<%= name %>Strategy
  implements <%= name %>CreationStrategy<Reconstitute<%= name %>Input>
{
  execute(input: Reconstitute<%= name %>Input): <%= name %> {
    return <%= name %>._create(
      {
        name: input.name,
      },
      input.id,
      input.createdAt,
      input.updatedAt,
    );
  }
}
