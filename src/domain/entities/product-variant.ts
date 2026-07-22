import { BaseDomainModel } from '@/shared/domain/base-domain-model';

export type ProductVariantProps = {
  productId: string;
  label: string | null;
  sku: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  isActive: boolean;
  imageId: string | null;
  imageUrl: string | null;
};

export class ProductVariant extends BaseDomainModel<ProductVariantProps> {
  private _deletedAt: Date | null;

  private constructor(
    props: ProductVariantProps,
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
    props: ProductVariantProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ): ProductVariant {
    return new ProductVariant(props, id, createdAt, updatedAt, deletedAt);
  }

  private validate(): void {
    if (!this.props.productId) throw new Error('Variant product is required');
    if (this.props.label !== null && !this.props.label.trim()) {
      throw new Error('Variant label cannot be blank');
    }
    if (!this.props.sku.trim()) throw new Error('Variant SKU is required');
    if (this.props.label !== null && this.props.label.length > 120) {
      throw new Error('Variant label must be at most 120 characters');
    }
    if (this.props.sku.length > 100) {
      throw new Error('Variant SKU must be at most 100 characters');
    }
    if (!Number.isInteger(this.props.price) || this.props.price < 0) {
      throw new Error('Variant price must be a non-negative integer');
    }
    if (
      this.props.comparePrice !== null &&
      (!Number.isInteger(this.props.comparePrice) ||
        this.props.comparePrice < this.props.price)
    ) {
      throw new Error('Variant compare price must be at least the price');
    }
    if (!Number.isInteger(this.props.stock) || this.props.stock < 0) {
      throw new Error('Variant stock must be a non-negative integer');
    }
  }

  get productId(): string {
    return this.props.productId;
  }
  get label(): string | null {
    return this.props.label;
  }
  get sku(): string {
    return this.props.sku;
  }
  get price(): number {
    return this.props.price;
  }
  get comparePrice(): number | null {
    return this.props.comparePrice;
  }
  get stock(): number {
    return this.props.stock;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get imageId(): string | null {
    return this.props.imageId;
  }
  get imageUrl(): string | null {
    return this.props.imageUrl;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  update(input: Partial<Omit<ProductVariantProps, 'productId'>>): void {
    if (input.label !== undefined) this.props.label = input.label;
    if (input.sku !== undefined) this.props.sku = input.sku;
    if (input.price !== undefined) this.props.price = input.price;
    if (input.comparePrice !== undefined)
      this.props.comparePrice = input.comparePrice;
    if (input.stock !== undefined) this.props.stock = input.stock;
    if (input.isActive !== undefined) this.props.isActive = input.isActive;
    if (input.imageId !== undefined) this.props.imageId = input.imageId;
    if (input.imageUrl !== undefined) this.props.imageUrl = input.imageUrl;
    this.validate();
    this.touch();
  }

  decrementStock(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Variant stock quantity must be a positive integer');
    }
    if (quantity > this.props.stock)
      throw new Error('Insufficient variant stock');
    this.props.stock -= quantity;
    this.touch();
  }

  incrementStock(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Variant stock quantity must be a positive integer');
    }
    this.props.stock += quantity;
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
      productId: this.productId,
      label: this.label,
      sku: this.sku,
      price: this.price,
      comparePrice: this.comparePrice,
      stock: this.stock,
      isActive: this.isActive,
      imageId: this.imageId,
      imageUrl: this.imageUrl,
      deletedAt: this.deletedAt,
    };
  }
}
