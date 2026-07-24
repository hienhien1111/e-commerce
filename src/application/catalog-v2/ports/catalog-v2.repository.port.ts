import type {
  CatalogV2Filters,
  CatalogV2Product,
  CatalogV2ProductPage,
  CreateCatalogProductInput,
  InventoryAdjustmentInput,
  InventoryBalanceView,
  UpdateCatalogProductInput,
} from '@/application/catalog-v2/types/catalog-v2.types';

export interface CatalogV2RepositoryPort {
  create(input: CreateCatalogProductInput): Promise<CatalogV2Product>;
  update(
    id: string,
    input: UpdateCatalogProductInput,
  ): Promise<CatalogV2Product>;
  findPublicById(id: string): Promise<CatalogV2Product | null>;
  findAdminById(id: string): Promise<CatalogV2Product | null>;
  findPublicPage(input: {
    filters: CatalogV2Filters;
    cursor: string | null;
    limit: number;
  }): Promise<CatalogV2ProductPage>;
  adjustInventory(
    input: InventoryAdjustmentInput,
  ): Promise<InventoryBalanceView>;
  refreshProjection(productId: string): Promise<void>;
}
