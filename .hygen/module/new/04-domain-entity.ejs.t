---
to: src/domain/entities/<%= h.changeCase.kebab(sampleEntity) %>.ts
---
import { BaseDomainModel } from '@/shared/domain/base-domain-model';

export interface <%= sampleEntity %>Props {
  name: string;
}

export class <%= sampleEntity %> extends BaseDomainModel<<%= sampleEntity %>Props> {
  private constructor(
    props: <%= sampleEntity %>Props,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(props, id, createdAt, updatedAt);
    this.validate();
  }

  static create(props: <%= sampleEntity %>Props, id: string): <%= sampleEntity %> {
    return new <%= sampleEntity %>(props, id);
  }

  static reconstitute(
    props: <%= sampleEntity %>Props,
    id: string,
    createdAt: Date,
    updatedAt: Date,
  ): <%= sampleEntity %> {
    return new <%= sampleEntity %>(props, id, createdAt, updatedAt);
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length === 0) {
      throw new Error('<%= sampleEntity %> name is required');
    }
  }

  get name(): string {
    return this.props.name;
  }

  rename(name: string): void {
    this.props = { ...this.props, name };
    this.touch();
  }
}
