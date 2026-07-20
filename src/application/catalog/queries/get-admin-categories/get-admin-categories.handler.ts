import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { CATEGORY_REPOSITORY_PORT } from '@/application/catalog/ports/category.repository.port.token';
import type { CategoryRepositoryPort } from '@/application/catalog/ports/category.repository.port';
import { GetAdminCategoriesQuery } from './get-admin-categories.query';

@QueryHandler(GetAdminCategoriesQuery)
export class GetAdminCategoriesHandler
  implements IQueryHandler<GetAdminCategoriesQuery>
{
  constructor(
    @Inject(CATEGORY_REPOSITORY_PORT)
    private readonly categories: CategoryRepositoryPort,
  ) {}

  execute(query: GetAdminCategoriesQuery) {
    return this.categories.findAdmin(query.filters);
  }
}
