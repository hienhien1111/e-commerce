import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ProductRepositoryPort } from '@/application/catalog/ports/product.repository.port';
import { PRODUCT_REPOSITORY_PORT } from '@/application/catalog/ports/product.repository.port.token';
import { ApplicationError } from '@/application/shared/errors/application.error';
import { GetAdminProductQuery } from './get-admin-product.query';

@QueryHandler(GetAdminProductQuery)
export class GetAdminProductHandler
  implements IQueryHandler<GetAdminProductQuery>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY_PORT)
    private readonly products: ProductRepositoryPort,
  ) {}

  async execute(query: GetAdminProductQuery) {
    const product = await this.products.findById(query.id);
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
