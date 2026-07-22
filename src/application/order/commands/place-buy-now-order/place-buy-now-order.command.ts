import { ICommand } from '@nestjs/cqrs';
import { ShippingAddress } from '@/domain/entities/order';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';

export class PlaceBuyNowOrderCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly productId: string | undefined,
    public readonly variantId: string | undefined,
    public readonly quantity: number,
    public readonly couponCode: string | undefined,
    public readonly shippingAddress: ShippingAddress,
    public readonly paymentMethod: PaymentMethodEnum,
  ) {}
}
