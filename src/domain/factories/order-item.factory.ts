import { OrderItem, OrderItemProps } from '@/domain/entities/order-item';
import { generateUuidV7 } from '@/utils/uuid-v7';

export class OrderItemFactory {
  static create(
    input: Omit<OrderItemProps, 'variantId' | 'snapshot'> & {
      variantId?: string;
      snapshot: Omit<OrderItemProps['snapshot'], 'variantLabel'> & {
        variantLabel?: string | null;
      };
      id?: string;
    },
  ): OrderItem {
    return OrderItem._create(
      {
        ...input,
        variantId: input.variantId ?? input.productId,
        snapshot: {
          ...input.snapshot,
          variantLabel: input.snapshot.variantLabel ?? null,
        },
      },
      input.id ?? generateUuidV7(),
    );
  }
}
