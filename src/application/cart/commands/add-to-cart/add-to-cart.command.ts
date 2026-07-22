import { ICommand } from '@nestjs/cqrs';

export class AddToCartCommand implements ICommand {
  constructor(
    public readonly userId: string,
    public readonly productId: string | null,
    public readonly variantId: string | null,
    public readonly quantity: number,
  ) {}
}
