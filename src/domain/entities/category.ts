import { BaseDomainModel } from '@/shared/domain/base-domain-model';

export type CategoryProps = {
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

export class Category extends BaseDomainModel<CategoryProps> {
  private _deletedAt: Date | null;

  private constructor(
    props: CategoryProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ) {
    super(props, id, createdAt, updatedAt);
    this._deletedAt = deletedAt ?? null;
    this.validate();
  }

  static _create(
    props: CategoryProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ): Category {
    return new Category(props, id, createdAt, updatedAt, deletedAt);
  }

  private validate(): void {
    if (!this.props.name.trim()) {
      throw new Error('Category name is required');
    }
    if (!this.props.slug.trim()) {
      throw new Error('Category slug is required');
    }
    if (!Number.isInteger(this.props.sortOrder) || this.props.sortOrder < 0) {
      throw new Error('Category sort order must be a non-negative integer');
    }
  }

  get name(): string {
    return this.props.name;
  }
  get slug(): string {
    return this.props.slug;
  }
  get description(): string | null {
    return this.props.description;
  }
  get parentId(): string | null {
    return this.props.parentId;
  }
  get sortOrder(): number {
    return this.props.sortOrder;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  update(input: Partial<CategoryProps>): void {
    if (input.name !== undefined) this.props.name = input.name;
    if (input.slug !== undefined) this.props.slug = input.slug;
    if (input.description !== undefined)
      this.props.description = input.description;
    if (input.parentId !== undefined) this.props.parentId = input.parentId;
    if (input.sortOrder !== undefined) this.props.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) this.props.isActive = input.isActive;
    this.validate();
    this.touch();
  }

  softDelete(): void {
    if (!this._deletedAt) {
      this._deletedAt = new Date();
      this.touch();
    }
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      name: this.name,
      slug: this.slug,
      description: this.description,
      parentId: this.parentId,
      sortOrder: this.sortOrder,
      isActive: this.isActive,
      deletedAt: this.deletedAt,
    };
  }
}
