import { IQuery } from '@nestjs/cqrs';
import { ProductFilters } from '@/application/catalog/types/catalog.types';

export class GetProductsQuery implements IQuery {
  constructor(
    public readonly filters: ProductFilters,
    public readonly cursor: string | null,
    public readonly limit: number,
  ) {}
}
