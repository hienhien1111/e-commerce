import { IQuery } from '@nestjs/cqrs';
import { AdminOrderFilters } from '@/application/order/types/order.types';
export class GetAdminOrdersQuery implements IQuery {
  constructor(public readonly filters: AdminOrderFilters) {}
}
