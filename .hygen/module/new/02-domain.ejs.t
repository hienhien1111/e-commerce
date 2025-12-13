---
to: src/domain/entities/<%= nameKebabCase %>.ts
skip_if: <%= addToDomain ? false : true %>
---
import { BaseDomainModel } from '@/shared/domain/base-domain-model';

export interface <%= name %>EssentialProps {
  name: string;
}

type <%= name %>InternalProps = <%= name %>EssentialProps & {
  // Add optional props and relations here
};

export class <%= name %> extends BaseDomainModel<<%= name %>InternalProps> {
  private constructor(
    props: <%= name %>InternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(props, id, createdAt, updatedAt);
    this.validate();
  }

  static _create(
    props: <%= name %>InternalProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ): <%= name %> {
    return new <%= name %>(props, id, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('<%= name %> name is required');
    }
  }

  get name(): <%= name %>EssentialProps['name'] {
    return this.props.name;
  }

  updateName(name: NonNullable<<%= name %>EssentialProps['name']>): void {
    if (!name || name.trim().length === 0) {
      throw new Error('<%= name %> name cannot be empty');
    }
    this.props.name = name;
    this.touch();
  }
}
