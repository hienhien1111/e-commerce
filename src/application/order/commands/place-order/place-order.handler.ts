import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { OrderCheckoutPort } from '@/application/order/ports/order-checkout.port';
import { ORDER_CHECKOUT_PORT } from '@/application/order/ports/order-checkout.port.token';
import { OrderReservationWaiter } from '@/application/order/services/order-reservation-waiter.service';
import { PlaceOrderCommand } from './place-order.command';

@CommandHandler(PlaceOrderCommand)
export class PlaceOrderHandler implements ICommandHandler<PlaceOrderCommand> {
  constructor(
    @Inject(ORDER_CHECKOUT_PORT) private readonly checkout: OrderCheckoutPort,
    private readonly reservationWaiter: OrderReservationWaiter,
  ) {}

  async execute(command: PlaceOrderCommand) {
    const order = await this.checkout.checkout(command);
    return this.reservationWaiter.wait(order);
  }
}
