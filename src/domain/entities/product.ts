import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { InsufficientStockException } from '@/domain/exceptions/insufficient-stock.exception';
import { ProductImage } from '@/domain/entities/product-image';
import { ProductVariant } from '@/domain/entities/product-variant';

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
  variants: ProductVariant[];
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
    if (this.props.variants.length === 0) {
      throw new Error('Product requires a default variant');
    }
    if (this.props.variants.length > 100) {
      throw new Error('A product can have at most 100 variants');
    }
    const hiddenVariants = this.props.variants.filter(
      (variant) => variant.label === null && !variant.deletedAt,
    );
    if (hiddenVariants.length > 1) {
      throw new Error('Product can have only one hidden default variant');
    }
    if (hiddenVariants.length === 1 && this.props.variants.length > 1) {
      throw new Error(
        'Hidden default variant must be labelled before adding variants',
      );
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
    // SKU belongs to the sellable variant. Keep the Product column as a
    // backwards-compatible projection only; the HTTP model exposes the
    // effective SKU for simple products.
    return this.activeVariants.length === 1 ? this.activeVariants[0].sku : null;
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
  get variants(): readonly ProductVariant[] {
    return this.props.variants;
  }
  get activeVariants(): readonly ProductVariant[] {
    return this.props.variants.filter(
      (variant) => variant.isActive && !variant.deletedAt,
    );
  }
  get hasVariants(): boolean {
    return this.activeVariants.some((variant) => variant.label !== null);
  }
  get priceRange(): { min: number; max: number } {
    const variants = this.activeVariants;
    const prices = variants.map((variant) => variant.price);
    return {
      min: prices.length ? Math.min(...prices) : this.price,
      max: prices.length ? Math.max(...prices) : this.price,
    };
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

  addVariant(variant: ProductVariant): void {
    if (variant.productId !== this.id) {
      throw new Error('Variant does not belong to this product');
    }
    if (this.props.variants.length >= 100) {
      throw new Error('A product can have at most 100 variants');
    }
    if (
      this.props.variants.some((item) => item.label === null && !item.deletedAt)
    ) {
      throw new Error(
        'Hidden default variant must be labelled before adding variants',
      );
    }
    this.props.variants.push(variant);
    this.syncProjection();
    this.touch();
  }

  findVariant(variantId: string): ProductVariant | null {
    return (
      this.props.variants.find((variant) => variant.id === variantId) ?? null
    );
  }

  removeVariant(variantId: string): ProductVariant | null {
    const variant = this.findVariant(variantId);
    if (!variant || variant.deletedAt) return null;
    if (this.props.variants.filter((item) => !item.deletedAt).length <= 1) {
      throw new Error('Product requires at least one variant');
    }
    variant.softDelete();
    this.syncProjection();
    this.touch();
    return variant;
  }

  syncProjection(): void {
    const active = this.activeVariants;
    if (!active.length) return;
    const lowest = [...active].sort(
      (left, right) => left.price - right.price,
    )[0];
    this.props.price = lowest.price;
    this.props.comparePrice = lowest.comparePrice;
    this.props.stock = active.reduce(
      (total, variant) => total + variant.stock,
      0,
    );
    this.props.sku = active.length === 1 ? active[0].sku : null;
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
      hasVariants: this.hasVariants,
      priceRange: this.priceRange,
      variants: this.variants.map((variant) => variant.toJSON()),
      deletedAt: this.deletedAt,
    };
  }
}
