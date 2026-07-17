import { Product } from '@/domain/entities/product';

export class ProductCreatedEvent {
  constructor(public readonly product: Product) {}
}
