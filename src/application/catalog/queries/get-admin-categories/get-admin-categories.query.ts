import type { IQuery } from '@nestjs/cqrs';
import type { AdminCategoryFilters } from '@/application/catalog/types/catalog.types';

export class GetAdminCategoriesQuery implements IQuery {
  constructor(public readonly filters: AdminCategoryFilters) {}
}
