import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { OrderCheckoutPort } from '@/application/order/ports/order-checkout.port';
import { ORDER_CHECKOUT_PORT } from '@/application/order/ports/order-checkout.port.token';
import { OrderReservationWaiter } from '@/application/order/services/order-reservation-waiter.service';
import { PlaceBuyNowOrderCommand } from './place-buy-now-order.command';

@CommandHandler(PlaceBuyNowOrderCommand)
export class PlaceBuyNowOrderHandler
  implements ICommandHandler<PlaceBuyNowOrderCommand>
{
  constructor(
    @Inject(ORDER_CHECKOUT_PORT) private readonly checkout: OrderCheckoutPort,
    private readonly reservationWaiter: OrderReservationWaiter,
  ) {}

  async execute(command: PlaceBuyNowOrderCommand) {
    const order = await this.checkout.checkoutBuyNow(command);
    return this.reservationWaiter.wait(order);
  }
}
