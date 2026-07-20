import { ICommand } from '@nestjs/cqrs';
import { ShippingAddress } from '@/domain/entities/order';

export class PlaceOrderCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly shippingAddress: ShippingAddress,
  ) {}
}
