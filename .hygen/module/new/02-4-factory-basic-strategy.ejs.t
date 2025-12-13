---
to: src/domain/services/create-basic-<%= nameKebabCase %>.strategy.ts
skip_if: <%= addToDomain ? false : true %>
---
import { <%= name %> } from '../entities/<%= nameKebabCase %>';
import { <%= name %>CreationStrategy, Create<%= name %>Input } from './<%= nameKebabCase %>-creation.strategy';
import { generateUuidV7 } from '@/utils/uuid-v7';

export class CreateBasic<%= name %>Strategy
  implements <%= name %>CreationStrategy<Create<%= name %>Input>
{
  execute(input: Create<%= name %>Input): <%= name %> {
    return <%= name %>._create(
      {
        name: input.name,
      },
      generateUuidV7(),
    );
  }
}
