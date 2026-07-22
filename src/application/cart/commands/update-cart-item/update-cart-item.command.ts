import { ICommand } from '@nestjs/cqrs';

export class UpdateCartItemCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly variantId: string,
    public readonly quantity: number,
  ) {}
}
