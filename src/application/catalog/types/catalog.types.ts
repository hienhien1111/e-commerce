import { Category } from '@/domain/entities/category';
import { Product } from '@/domain/entities/product';

export type CursorPage<T> = {
  data: T[];
  nextCursor: string | null;
};

export type ProductFilters = {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
};

export type AdminProductFilters = Pick<
  ProductFilters,
  'categoryId' | 'search'
> & {
  isActive?: boolean;
};

export type AdminCategoryFilters = {
  parentId?: string;
  isActive?: boolean;
};

export type ProductPage = CursorPage<Product>;
export type CategoryList = Category[];
