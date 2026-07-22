import { ICommand } from '@nestjs/cqrs';

export class DeactivateCouponCommand implements ICommand {
  constructor(public readonly id: string) {}
}
