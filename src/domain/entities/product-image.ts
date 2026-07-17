import { BaseDomainModel } from '@/shared/domain/base-domain-model';

export type ProductImageProps = {
  url: string;
  publicId: string;
  isPrimary: boolean;
  sortOrder: number;
};

export class ProductImage extends BaseDomainModel<ProductImageProps> {
  private constructor(
    props: ProductImageProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(props, id, createdAt, updatedAt);
    if (!props.url || !props.publicId) {
      throw new Error('Product image URL and public ID are required');
    }
    if (!Number.isInteger(props.sortOrder) || props.sortOrder < 0) {
      throw new Error(
        'Product image sort order must be a non-negative integer',
      );
    }
  }

  static _create(
    props: ProductImageProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
  ): ProductImage {
    return new ProductImage(props, id, createdAt, updatedAt);
  }

  get url(): string {
    return this.props.url;
  }
  get publicId(): string {
    return this.props.publicId;
  }
  get isPrimary(): boolean {
    return this.props.isPrimary;
  }
  get sortOrder(): number {
    return this.props.sortOrder;
  }

  setPrimary(isPrimary: boolean): void {
    this.props.isPrimary = isPrimary;
    this.touch();
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      url: this.url,
      isPrimary: this.isPrimary,
      sortOrder: this.sortOrder,
      createdAt: this.createdAt,
    };
  }
}
