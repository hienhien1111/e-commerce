import { ShippingAddress, Order } from '@/domain/entities/order';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';

export interface OrderCheckoutPort {
  checkout(input: {
    userId: string;
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethodEnum;
  }): Promise<Order>;

  checkoutBuyNow(input: {
    userId: string;
    productId?: string;
    variantId?: string;
    quantity: number;
    couponCode?: string;
    shippingAddress: ShippingAddress;
    paymentMethod: PaymentMethodEnum;
  }): Promise<Order>;
}
