import { Order, OrderProps } from '@/domain/entities/order';
import { generateUuidV7 } from '@/utils/uuid-v7';

export class OrderFactory {
  static create(input: OrderProps & { id?: string }): Order {
    return Order._create(
      input,
      input.id ?? generateUuidV7(),
      undefined,
      undefined,
      null,
      true,
    );
  }

  static reconstitute(
    input: OrderProps & {
      id: string;
      createdAt: Date;
      updatedAt: Date;
      deletedAt: Date | null;
    },
  ): Order {
    return Order._create(
      input,
      input.id,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
    );
  }
}
