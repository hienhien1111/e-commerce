import { ICommand } from '@nestjs/cqrs';
import type { CreateProductVariantPayload } from '../create-product-variant/create-product-variant.command';

export type CreateProductPayload = {
  name: string;
  description?: string | null;
  price: number;
  comparePrice?: number | null;
  stock?: number;
  sku?: string | null;
  categoryId?: string | null;
  isActive?: boolean;
  /**
   * Optional atomic creation path for the legacy admin editor. When present,
   * the product is born with these sellable variants instead of a temporary
   * hidden/default variant that an admin would have to edit afterwards.
   */
  variants?: CreateProductVariantPayload[];
};

export class CreateProductCommand implements ICommand {
  constructor(public readonly payload: CreateProductPayload) {}
}
