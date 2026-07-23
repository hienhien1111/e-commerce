import { Order } from '@/domain/entities/order';
import {
  AdminOrderFilters,
  OrderFilters,
  OrderPage,
  OrderStats,
} from '@/application/order/types/order.types';
import { NullableType } from '@/utils/types/nullable.type';

export interface OrderRepositoryPort {
  findById(id: string): Promise<NullableType<Order>>;
  findByIdForUser(id: string, userId: string): Promise<NullableType<Order>>;
  findPageForUser(userId: string, filters: OrderFilters): Promise<OrderPage>;
  findAdminPage(filters: AdminOrderFilters): Promise<OrderPage>;
  getStats(
    filters: Pick<AdminOrderFilters, 'from' | 'to'>,
  ): Promise<OrderStats>;
  save(order: Order): Promise<Order>;
}
