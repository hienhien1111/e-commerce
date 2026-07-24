import type { CatalogV2Filters } from '@/application/catalog-v2/types/catalog-v2.types';

export class GetCatalogProductsV2Query {
  constructor(
    public readonly filters: CatalogV2Filters,
    public readonly cursor: string | null,
    public readonly limit: number,
  ) {}
}
