import { ICommand } from '@nestjs/cqrs';
import { CreatePayinOrderDto } from '@/infrastructure/dto/order.dto';

export class CreatePayinOrderCommand implements ICommand {
  constructor(public readonly dto: CreatePayinOrderDto) {}
}
