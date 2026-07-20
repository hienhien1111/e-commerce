import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { CategoryRepositoryPort } from '@/application/catalog/ports/category.repository.port';
import { CATEGORY_REPOSITORY_PORT } from '@/application/catalog/ports/category.repository.port.token';
import { GetCategoriesQuery } from './get-categories.query';

@QueryHandler(GetCategoriesQuery)
export class GetCategoriesHandler implements IQueryHandler<GetCategoriesQuery> {
  constructor(
    @Inject(CATEGORY_REPOSITORY_PORT)
    private readonly categoryRepository: CategoryRepositoryPort,
  ) {}

  execute(query: GetCategoriesQuery) {
    return this.categoryRepository.findPublic({ parentId: query.parentId });
  }
}
