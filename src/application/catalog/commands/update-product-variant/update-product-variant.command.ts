import { ICommand } from '@nestjs/cqrs';
import { CreateProductVariantPayload } from '../create-product-variant/create-product-variant.command';

export class UpdateProductVariantCommand implements ICommand {
  constructor(
    public readonly productId: string,
    public readonly variantId: string,
    public readonly payload: Partial<CreateProductVariantPayload>,
  ) {}
}
