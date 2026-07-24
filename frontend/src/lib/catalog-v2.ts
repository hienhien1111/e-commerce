/** Canonical storefront contract served by /api/v2/products. */
export type CatalogV2Media = {
  id: string;
  url: string;
  publicId: string;
  isPrimary: boolean;
  sortOrder: number;
};

export type CatalogV2Option = {
  id: string;
  code: string;
  name: string;
  position: number;
  values: Array<{
    id: string;
    code: string;
    label: string;
    position: number;
  }>;
};

export type CatalogV2Variant = {
  id: string;
  sku: string;
  price: number;
  comparePrice: number | null;
  currency: 'VND';
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
  optionValueIds: string[];
  availableQuantity: number;
  media: CatalogV2Media[];
};

export type CatalogV2Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  categoryId: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  publishedAt: string | null;
  media: CatalogV2Media[];
  options: CatalogV2Option[];
  variants: CatalogV2Variant[];
  summary: {
    priceMin: number;
    priceMax: number;
    availableQuantity: number;
    sellableVariantCount: number;
    primaryMediaUrl: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type CatalogV2ProductPage = {
  data: CatalogV2Product[];
  nextCursor: string | null;
};
