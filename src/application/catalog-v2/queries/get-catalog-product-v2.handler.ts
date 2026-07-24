import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { CatalogV2RepositoryPort } from '@/application/catalog-v2/ports/catalog-v2.repository.port';
import { CATALOG_V2_REPOSITORY_PORT } from '@/application/catalog-v2/ports/catalog-v2.repository.port.token';
import { ApplicationError } from '@/application/shared/errors/application.error';
import { GetCatalogProductV2Query } from './get-catalog-product-v2.query';

@QueryHandler(GetCatalogProductV2Query)
export class GetCatalogProductV2Handler
  implements IQueryHandler<GetCatalogProductV2Query>
{
  constructor(
    @Inject(CATALOG_V2_REPOSITORY_PORT)
    private readonly repository: CatalogV2RepositoryPort,
  ) {}

  async execute(query: GetCatalogProductV2Query) {
    const product = query.admin
      ? await this.repository.findAdminById(query.id)
      : await this.repository.findPublicById(query.id);
    if (!product) {
      throw new ApplicationError(
        'PRODUCT_NOT_FOUND',
        'Product not found',
        'NOT_FOUND',
      );
    }
    return product;
  }
}
