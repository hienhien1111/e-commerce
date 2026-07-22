export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type ProductImage = {
  id: string;
  url: string;
  isPrimary: boolean;
  sortOrder: number;
  createdAt: string;
};

export type ProductVariant = {
  id: string;
  label: string | null;
  sku: string;
  price: number;
  comparePrice: number | null;
  stock: number;
  isActive: boolean;
  imageId: string | null;
  imageUrl: string | null;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  comparePrice: number | null;
  stock: number;
  sku: string | null;
  hasVariants: boolean;
  priceRange: { min: number; max: number };
  categoryId: string | null;
  isActive: boolean;
  images: ProductImage[];
  variants: ProductVariant[];
};

export type ProductPage = {
  data: Product[];
  nextCursor: string | null;
};

export const formatVnd = (amount: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
