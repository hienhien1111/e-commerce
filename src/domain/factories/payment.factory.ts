import { Payment, PaymentProps } from '@/domain/entities/payment';
import { generateUuidV7 } from '@/utils/uuid-v7';

export class PaymentFactory {
  static create(input: PaymentProps & { id?: string }): Payment {
    return Payment._create(input, input.id ?? generateUuidV7());
  }

  static reconstitute(
    input: PaymentProps & { id: string; createdAt: Date; updatedAt: Date },
  ): Payment {
    return Payment._create(input, input.id, input.createdAt, input.updatedAt);
  }
}
