import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { CreatePayinOrderCommand } from './create-payin-order.command';
import { CreatePayinOrderResult } from './create-payin-order.result';
import type { TransfiApiPort } from '../../ports/transfi-api.port';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';
import type { PaymentOrderRepositoryPort } from '../../ports/transfi-order-repository.port';
import { TRANSFI_ORDER_REPOSITORY_PORT } from '../../ports/transfi-order-repository.port';
import type { PaymentUserRepositoryPort } from '../../ports/transfi-user-repository.port';
import { TRANSFI_USER_REPOSITORY_PORT } from '../../ports/transfi-user-repository.port';
import { OrderStatus } from '@/domain/value-objects/order-status';

@CommandHandler(CreatePayinOrderCommand)
export class CreatePayinOrderHandler
  implements ICommandHandler<CreatePayinOrderCommand>
{
  constructor(
    @Inject(TRANSFI_API_PORT)
    private readonly transfiApi: TransfiApiPort,
    @Inject(TRANSFI_ORDER_REPOSITORY_PORT)
    private readonly orderRepository: PaymentOrderRepositoryPort,
    @Inject(TRANSFI_USER_REPOSITORY_PORT)
    private readonly userRepository: PaymentUserRepositoryPort,
  ) {}

  async execute(
    command: CreatePayinOrderCommand,
  ): Promise<CreatePayinOrderResult> {
    const { dto } = command;

    const user = await this.userRepository.findByPaymentUserId(
      dto.transfiUserId,
    );
    if (!user) {
      throw new Error(
        `Transfi user ${dto.transfiUserId} not found in local database`,
      );
    }

    const orderResponse = await this.transfiApi.createPayinOrder(dto);

    await this.orderRepository.create({
      orderId: orderResponse.orderId,
      externalOrderId: dto.externalOrderId,
      transfiUserId: user.id,
      orderType: 'payin',
      currencyType: 'fiat',
      sourceCurrency: dto.sourceCurrency,
      destinationCurrency: dto.destinationCurrency,
      sourceAmount: dto.sourceAmount,
      destinationAmount: orderResponse.destinationAmount,
      fee: orderResponse.fee,
      rate: orderResponse.rate,
      paymentMethod: dto.paymentMethod,
      status: orderResponse.status
        ? OrderStatus.fromString(orderResponse.status)
        : OrderStatus.PENDING,
      paymentUrl: orderResponse.paymentUrl,
      callbackUrl: dto.callbackUrl,
    });

    return orderResponse;
  }
}
