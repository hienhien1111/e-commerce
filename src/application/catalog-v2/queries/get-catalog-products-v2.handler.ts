import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { CatalogV2RepositoryPort } from '@/application/catalog-v2/ports/catalog-v2.repository.port';
import { CATALOG_V2_REPOSITORY_PORT } from '@/application/catalog-v2/ports/catalog-v2.repository.port.token';
import { GetCatalogProductsV2Query } from './get-catalog-products-v2.query';

@QueryHandler(GetCatalogProductsV2Query)
export class GetCatalogProductsV2Handler
  implements IQueryHandler<GetCatalogProductsV2Query>
{
  constructor(
    @Inject(CATALOG_V2_REPOSITORY_PORT)
    private readonly repository: CatalogV2RepositoryPort,
  ) {}

  execute(query: GetCatalogProductsV2Query) {
    return this.repository.findPublicPage({
      filters: query.filters,
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
