import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { InsufficientStockException } from '@/domain/exceptions/insufficient-stock.exception';
import { ProductImage } from '@/domain/entities/product-image';

export type ProductProps = {
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  stock: number;
  sku: string | null;
  categoryId: string | null;
  isActive: boolean;
  images: ProductImage[];
};

export class Product extends BaseDomainModel<ProductProps> {
  private _deletedAt: Date | null;

  private constructor(
    props: ProductProps,
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
    props: ProductProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    deletedAt?: Date | null,
  ): Product {
    return new Product(props, id, createdAt, updatedAt, deletedAt);
  }

  private validate(): void {
    if (!this.props.name.trim()) throw new Error('Product name is required');
    if (!this.props.slug.trim()) throw new Error('Product slug is required');
    if (!Number.isInteger(this.props.price) || this.props.price < 0) {
      throw new Error('Product price must be a non-negative integer');
    }
    if (
      this.props.comparePrice !== null &&
      (!Number.isInteger(this.props.comparePrice) ||
        this.props.comparePrice < this.props.price)
    ) {
      throw new Error('Product compare price must be at least the price');
    }
    if (!Number.isInteger(this.props.stock) || this.props.stock < 0) {
      throw new Error('Product stock must be a non-negative integer');
    }
    if (this.props.images.length > 5) {
      throw new Error('A product can have at most 5 images');
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
  get price(): number {
    return this.props.price;
  }
  get comparePrice(): number | null {
    return this.props.comparePrice;
  }
  get stock(): number {
    return this.props.stock;
  }
  get sku(): string | null {
    return this.props.sku;
  }
  get categoryId(): string | null {
    return this.props.categoryId;
  }
  get isActive(): boolean {
    return this.props.isActive;
  }
  get images(): readonly ProductImage[] {
    return this.props.images;
  }
  get deletedAt(): Date | null {
    return this._deletedAt;
  }

  update(input: Partial<Omit<ProductProps, 'images'>>): void {
    if (input.name !== undefined) this.props.name = input.name;
    if (input.slug !== undefined) this.props.slug = input.slug;
    if (input.description !== undefined)
      this.props.description = input.description;
    if (input.price !== undefined) this.props.price = input.price;
    if (input.comparePrice !== undefined)
      this.props.comparePrice = input.comparePrice;
    if (input.stock !== undefined) this.props.stock = input.stock;
    if (input.sku !== undefined) this.props.sku = input.sku;
    if (input.categoryId !== undefined)
      this.props.categoryId = input.categoryId;
    if (input.isActive !== undefined) this.props.isActive = input.isActive;
    this.validate();
    this.touch();
  }

  addImage(image: ProductImage): void {
    if (this.props.images.length >= 5) {
      throw new Error('A product can have at most 5 images');
    }
    if (this.props.images.length === 0) {
      image.setPrimary(true);
    } else if (image.isPrimary) {
      this.props.images.forEach((existing) => existing.setPrimary(false));
    }
    this.props.images.push(image);
    this.touch();
  }

  removeImage(imageId: string): ProductImage | null {
    const index = this.props.images.findIndex((image) => image.id === imageId);
    if (index < 0) return null;

    const [removed] = this.props.images.splice(index, 1);
    if (removed.isPrimary && this.props.images.length > 0) {
      const nextPrimary = [...this.props.images].sort(
        (left, right) => left.sortOrder - right.sortOrder,
      )[0];
      nextPrimary.setPrimary(true);
    }
    this.touch();
    return removed;
  }

  incrementStock(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Stock quantity must be a positive integer');
    }
    this.props.stock += quantity;
    this.touch();
  }

  decrementStock(quantity: number): void {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('Stock quantity must be a positive integer');
    }
    if (quantity > this.props.stock) throw new InsufficientStockException();
    this.props.stock -= quantity;
    this.touch();
  }

  nextImageSortOrder(): number {
    return (
      this.props.images.reduce(
        (highest, image) => Math.max(highest, image.sortOrder),
        -1,
      ) + 1
    );
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
      price: this.price,
      comparePrice: this.comparePrice,
      stock: this.stock,
      sku: this.sku,
      categoryId: this.categoryId,
      isActive: this.isActive,
      images: this.images.map((image) => image.toJSON()),
      deletedAt: this.deletedAt,
    };
  }
}
