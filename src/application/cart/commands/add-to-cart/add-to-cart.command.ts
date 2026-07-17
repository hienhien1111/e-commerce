import { ICommand } from '@nestjs/cqrs';

export class AddToCartCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly productId: string,
    public readonly quantity: number,
  ) {}
}
