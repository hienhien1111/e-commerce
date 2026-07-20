import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { GetAdminProductsQuery } from './get-admin-products.query';

@QueryHandler(GetAdminProductsQuery)
export class GetAdminProductsHandler
  implements IQueryHandler<GetAdminProductsQuery>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly products: ProductRepositoryPort,
  ) {}

  execute(query: GetAdminProductsQuery) {
    return this.products.findAdminPage(query);
  }
}
