import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetOrderDetailsQuery } from './get-order-details.query';
import { GetOrderDetailsResult } from './get-order-details.result';
import type { TransfiApiPort } from '../../ports/transfi-api.port';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';
import type { PaymentOrderRepositoryPort } from '../../ports/transfi-order-repository.port';
import { TRANSFI_ORDER_REPOSITORY_PORT } from '../../ports/transfi-order-repository.port';
import { OrderStatus } from '@/domain/value-objects/order-status';

@QueryHandler(GetOrderDetailsQuery)
export class GetOrderDetailsHandler
  implements IQueryHandler<GetOrderDetailsQuery>
{
  constructor(
    @Inject(TRANSFI_API_PORT)
    private readonly transfiApi: TransfiApiPort,
    @Inject(TRANSFI_ORDER_REPOSITORY_PORT)
    private readonly orderRepository: PaymentOrderRepositoryPort,
  ) {}

  async execute(query: GetOrderDetailsQuery): Promise<GetOrderDetailsResult> {
    const { orderId } = query;

    const orderDetails = await this.transfiApi.getOrderDetails(orderId);

    const localOrder = await this.orderRepository.findByOrderId(orderId);
    if (localOrder) {
      await this.orderRepository.update(localOrder.id, {
        status: orderDetails.status
          ? OrderStatus.fromString(orderDetails.status)
          : localOrder.status,
        destinationAmount: orderDetails.destinationAmount,
        transactionHash: orderDetails.transactionHash,
        completedAt: orderDetails.completedAt
          ? new Date(orderDetails.completedAt)
          : undefined,
      });
    }

    return orderDetails;
  }
}
