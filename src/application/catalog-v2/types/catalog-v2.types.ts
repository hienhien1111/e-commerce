export const CatalogProductStatuses = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const;
export type CatalogProductStatus = (typeof CatalogProductStatuses)[number];

export const CatalogVariantStatuses = [
  'ACTIVE',
  'INACTIVE',
  'ARCHIVED',
] as const;
export type CatalogVariantStatus = (typeof CatalogVariantStatuses)[number];

export type CatalogOptionValueInput = {
  id?: string;
  code: string;
  label: string;
  position?: number;
};

export type CatalogOptionInput = {
  id?: string;
  code: string;
  name: string;
  position?: number;
  values: CatalogOptionValueInput[];
};

export type CatalogMediaInput = {
  id?: string;
  url: string;
  publicId: string;
  isPrimary?: boolean;
  sortOrder?: number;
};

export type CatalogOptionValueRef = {
  optionCode: string;
  valueCode: string;
};

export type CatalogVariantInput = {
  id?: string;
  sku: string;
  price: number;
  comparePrice?: number | null;
  status?: CatalogVariantStatus;
  /** Used for an existing option value. */
  optionValueIds?: string[];
  /** Used when options and variants are created in a single request. */
  optionValueRefs?: CatalogOptionValueRef[];
  mediaIds?: string[];
  /** Creates an immutable opening-balance movement; stock is never stored on Variant. */
  initialStock?: number;
};

export type CreateCatalogProductInput = {
  name: string;
  slug?: string;
  description?: string | null;
  categoryId?: string | null;
  status?: CatalogProductStatus;
  options?: CatalogOptionInput[];
  media?: CatalogMediaInput[];
  variants: CatalogVariantInput[];
};

export type UpdateCatalogProductInput = {
  name?: string;
  slug?: string;
  description?: string | null;
  categoryId?: string | null;
  status?: CatalogProductStatus;
  options?: CatalogOptionInput[];
  media?: CatalogMediaInput[];
  variants?: CatalogVariantInput[];
};

export type CatalogV2Filters = {
  categoryId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  optionValueIds?: string[];
  inStock?: boolean;
};

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
  status: CatalogVariantStatus;
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
  status: CatalogProductStatus;
  publishedAt: Date | null;
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
  createdAt: Date;
  updatedAt: Date;
};

export type CatalogV2ProductPage = {
  data: CatalogV2Product[];
  nextCursor: string | null;
};

export type InventoryAdjustmentInput = {
  variantId: string;
  quantityDelta: number;
  reason: string;
  warehouseCode?: string;
  idempotencyKey?: string;
};

export type InventoryBalanceView = {
  warehouseCode: string;
  variantId: string;
  onHand: number;
  reserved: number;
  availableQuantity: number;
};
