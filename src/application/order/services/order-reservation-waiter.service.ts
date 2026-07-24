import { Inject, Injectable } from '@nestjs/common';
import { ApplicationError } from '@/application/shared/errors/application.error';
import type { OrderRepositoryPort } from '@/application/order/ports/order.repository.port';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { Order } from '@/domain/entities/order';
import { ReservationStatusEnum } from '@/domain/enums/reservation-status.enum';

@Injectable()
export class OrderReservationWaiter {
  constructor(
    @Inject(ORDER_REPOSITORY_PORT)
    private readonly orders: OrderRepositoryPort,
  ) {}

  async wait(
    submitted: Order,
    timeoutMs = Number(process.env.COMMERCE_CHECKOUT_WAIT_MS ?? 5_000),
  ): Promise<Order> {
    if (submitted.reservationStatus !== ReservationStatusEnum.PENDING) {
      return this.assertReservation(submitted);
    }
    const deadline = Date.now() + timeoutMs;
    let current = submitted;
    while (Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      current = (await this.orders.findById(submitted.id)) ?? current;
      if (current.reservationStatus !== ReservationStatusEnum.PENDING) {
        return this.assertReservation(current);
      }
    }
    return current;
  }

  private assertReservation(order: Order): Order {
    if (order.reservationStatus !== ReservationStatusEnum.FAILED) return order;
    throw new ApplicationError(
      'RESERVATION_FAILED',
      'Không thể giữ tồn kho cho đơn hàng.',
      'UNPROCESSABLE',
      false,
      {
        orderId: order.id,
        reason: order.cancellationReason,
      },
    );
  }
}
