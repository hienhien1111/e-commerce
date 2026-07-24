import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { CommerceOperationRepositoryPort } from '@/application/admin/ports/commerce-operation.repository.port';
import { COMMERCE_OPERATION_REPOSITORY_PORT } from '@/application/admin/ports/commerce-operation.repository.port.token';
import { GetCommerceOperationsQuery } from './get-commerce-operations.query';

@QueryHandler(GetCommerceOperationsQuery)
export class GetCommerceOperationsHandler
  implements IQueryHandler<GetCommerceOperationsQuery>
{
  constructor(
    @Inject(COMMERCE_OPERATION_REPOSITORY_PORT)
    private readonly operations: CommerceOperationRepositoryPort,
  ) {}

  execute(query: GetCommerceOperationsQuery) {
    return this.operations.findPage({
      status: query.status,
      eventType: query.eventType,
      cursor: query.cursor,
      limit: query.limit,
    });
  }
}
