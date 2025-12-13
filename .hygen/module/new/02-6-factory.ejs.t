---
to: src/domain/factories/<%= nameKebabCase %>.factory.ts
skip_if: <%= addToDomain ? false : true %>
---
import { <%= name %> } from '../entities/<%= nameKebabCase %>';
import { <%= name %>CreationType } from './<%= nameKebabCase %>-creation-type.enum';
import { <%= name %>CreationStrategy, Create<%= name %>Input, Reconstitute<%= name %>Input } from '../services/<%= nameKebabCase %>-creation.strategy';
import { CreateBasic<%= name %>Strategy } from '../services/create-basic-<%= nameKebabCase %>.strategy';
import { Reconstitute<%= name %>Strategy } from '../services/reconstitute-<%= nameKebabCase %>.strategy';

export { Create<%= name %>Input, Reconstitute<%= name %>Input };

type <%= name %>CreationInput = Create<%= name %>Input | Reconstitute<%= name %>Input;

export class <%= name %>Factory {
  private static strategies: Record<
    <%= name %>CreationType,
    <%= name %>CreationStrategy<<%= name %>CreationInput>
  > = {
    [<%= name %>CreationType.BASIC]: new CreateBasic<%= name %>Strategy(),
    [<%= name %>CreationType.RECONSTITUTE]: new Reconstitute<%= name %>Strategy(),
  };

  private static getStrategy(
    type: <%= name %>CreationType,
  ): <%= name %>CreationStrategy<<%= name %>CreationInput> {
    const strategy = this.strategies[type];
    if (!strategy) {
      throw new Error(`<%= name %> creation strategy not found for type: ${type}`);
    }
    return strategy;
  }

  static create(input: Create<%= name %>Input): <%= name %> {
    return this.strategies[<%= name %>CreationType.BASIC].execute(input);
  }

  static reconstitute(input: Reconstitute<%= name %>Input): <%= name %> {
    return this.strategies[<%= name %>CreationType.RECONSTITUTE].execute(input);
  }

  static createByType(
    type: <%= name %>CreationType.BASIC,
    input: Create<%= name %>Input,
  ): <%= name %>;
  static createByType(
    type: <%= name %>CreationType.RECONSTITUTE,
    input: Reconstitute<%= name %>Input,
  ): <%= name %>;
  static createByType(
    type: <%= name %>CreationType,
    input: Create<%= name %>Input | Reconstitute<%= name %>Input,
  ): <%= name %> {
    return this.getStrategy(type).execute(input);
  }

  static registerStrategy(
    type: <%= name %>CreationType,
    strategy: <%= name %>CreationStrategy<<%= name %>CreationInput>,
  ): void {
    this.strategies[type] = strategy;
  }
}
