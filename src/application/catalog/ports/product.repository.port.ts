import { Product } from '@/domain/entities/product';
import { NullableType } from '@/utils/types/nullable.type';
import {
  ProductFilters,
  ProductPage,
} from '@/application/catalog/types/catalog.types';

export interface ProductRepositoryPort {
  create(product: Product): Promise<Product>;
  save(product: Product): Promise<Product>;
  findById(id: string): Promise<NullableType<Product>>;
  findPublicById(id: string): Promise<NullableType<Product>>;
  findBySlug(slug: string): Promise<NullableType<Product>>;
  findBySku(sku: string): Promise<NullableType<Product>>;
  findPublicPage(params: {
    filters: ProductFilters;
    cursor: string | null;
    limit: number;
  }): Promise<ProductPage>;
  existsByCategoryId(categoryId: string): Promise<boolean>;
}
