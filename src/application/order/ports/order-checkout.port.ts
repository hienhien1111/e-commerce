import { ShippingAddress, Order } from '@/domain/entities/order';

export interface OrderCheckoutPort {
  checkout(input: {
    userId: string;
    shippingAddress: ShippingAddress;
  }): Promise<Order>;
}
