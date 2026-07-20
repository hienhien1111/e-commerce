import { ICommand } from '@nestjs/cqrs';

export type CreateProductPayload = {
  name: string;
  description?: string | null;
  price: number;
  comparePrice?: number | null;
  stock?: number;
  sku?: string | null;
  categoryId?: string | null;
  isActive?: boolean;
};

export class CreateProductCommand implements ICommand {
  constructor(public readonly payload: CreateProductPayload) {}
}
