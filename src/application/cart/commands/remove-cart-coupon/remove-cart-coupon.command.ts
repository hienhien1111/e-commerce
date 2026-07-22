import { ICommand } from '@nestjs/cqrs';

export class RemoveCartCouponCommand implements ICommand {
  constructor(public readonly userId: string) {}
}
