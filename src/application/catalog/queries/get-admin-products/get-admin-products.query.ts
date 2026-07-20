import type { IQuery } from '@nestjs/cqrs';
import type { AdminProductFilters } from '@/application/catalog/types/catalog.types';

export class GetAdminProductsQuery implements IQuery {
  constructor(
    public readonly filters: AdminProductFilters,
    public readonly cursor: string | null,
    public readonly limit: number,
  ) {}
}
