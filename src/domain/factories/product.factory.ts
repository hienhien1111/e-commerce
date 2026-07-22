import { Product, ProductProps } from '@/domain/entities/product';
import { ProductVariantFactory } from '@/domain/factories/product-variant.factory';
import { generateUuidV7 } from '@/utils/uuid-v7';

type ProductInputWithoutVariants = Omit<ProductProps, 'variants'> & {
  variants?: ProductProps['variants'];
};

export type CreateProductInput = ProductInputWithoutVariants & { id?: string };
export type ReconstituteProductInput = ProductInputWithoutVariants & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class ProductFactory {
  static create(input: CreateProductInput): Product {
    const id = input.id ?? generateUuidV7();
    return Product._create(this.withDefaultVariant(input, id), id);
  }

  static reconstitute(input: ReconstituteProductInput): Product {
    return Product._create(
      this.withDefaultVariant(input, input.id),
      input.id,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
    );
  }

  // The application mapper always supplies variants. This fallback keeps
  // direct factory use backwards-compatible for fixtures and integrations
  // created before ProductVariant existed.
  private static withDefaultVariant(
    input: ProductInputWithoutVariants,
    productId: string,
  ): ProductProps {
    const { variants, ...props } = input;
    return {
      ...props,
      variants: variants ?? [
        ProductVariantFactory.create({
          productId,
          label: null,
          sku: input.sku ?? `PRODUCT-${productId}`,
          price: input.price,
          comparePrice: input.comparePrice,
          stock: input.stock,
          isActive: input.isActive,
          imageId: null,
          imageUrl: null,
        }),
      ],
    };
  }
}
