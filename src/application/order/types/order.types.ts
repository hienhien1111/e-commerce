import { Order } from '@/domain/entities/order';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { ReservationStatusEnum } from '@/domain/enums/reservation-status.enum';

export type OrderPage = { data: Order[]; nextCursor: string | null };

export type OrderFilters = {
  status?: OrderStatusEnum;
  cursor: string | null;
  limit: number;
};

export type AdminOrderFilters = OrderFilters & {
  userId?: string;
  search?: string;
  paymentMethod?: PaymentMethodEnum;
  paymentStatus?: PaymentStatusEnum;
  reservationStatus?: ReservationStatusEnum;
  from?: Date;
  to?: Date;
};

export type OrderStats = {
  counts: Record<OrderStatusEnum, number>;
  totalRevenue: number;
};
