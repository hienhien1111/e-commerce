import { ICommand } from '@nestjs/cqrs';
import { ShippingAddress } from '@/domain/entities/order';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';

export class PlaceOrderCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly shippingAddress: ShippingAddress,
    public readonly paymentMethod: PaymentMethodEnum,
  ) {}
}
