import { ICommand } from '@nestjs/cqrs';

export class ApplyCartCouponCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly code: string,
  ) {}
}
