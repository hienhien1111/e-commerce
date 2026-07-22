import { ICommand } from '@nestjs/cqrs';

export class DeleteProductVariantCommand implements ICommand {
  constructor(
    public readonly productId: string,
    public readonly variantId: string,
  ) {}
}
