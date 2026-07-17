import { ICommand } from '@nestjs/cqrs';
import { CreateProductPayload } from '../create-product/create-product.command';

export type UpdateProductPayload = Partial<CreateProductPayload>;

export class UpdateProductCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly payload: UpdateProductPayload,
  ) {}
}
