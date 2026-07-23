import { ICommand } from '@nestjs/cqrs';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';

export class UpdateOrderStatusCommand implements ICommand {
  constructor(
    public readonly orderId: string,
    public readonly status: OrderStatusEnum,
  ) {}
}
