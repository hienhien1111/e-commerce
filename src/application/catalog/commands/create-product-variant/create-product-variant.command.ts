import { ICommand } from '@nestjs/cqrs';

export type CreateProductVariantPayload = {
  label?: string | null;
  sku: string;
  price: number;
  comparePrice?: number | null;
  stock: number;
  isActive?: boolean;
  imageId?: string | null;
};

export class CreateProductVariantCommand implements ICommand {
  constructor(
    public readonly productId: string,
    public readonly payload: CreateProductVariantPayload,
  ) {}
}
