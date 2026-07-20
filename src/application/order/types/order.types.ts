import { Order } from '@/domain/entities/order';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';

export type OrderPage = { data: Order[]; nextCursor: string | null };

export type OrderFilters = {
  status?: OrderStatusEnum;
  cursor: string | null;
  limit: number;
};

export type AdminOrderFilters = OrderFilters & {
  userId?: string;
  from?: Date;
  to?: Date;
};

export type OrderStats = {
  counts: Record<OrderStatusEnum, number>;
  totalRevenue: number;
};
