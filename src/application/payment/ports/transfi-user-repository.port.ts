import {
  PaymentUser,
  PaymentUserEssentialProps,
} from '@/domain/entities/payment-user';

export interface PaymentUserRepositoryPort {
  findByUserId(userId: string): Promise<PaymentUser | null>;
  findByPaymentUserId(transfiUserId: string): Promise<PaymentUser | null>;
  create(user: Partial<PaymentUserEssentialProps>): Promise<PaymentUser>;
  update(id: string, user: Partial<PaymentUserEssentialProps>): Promise<void>;
  findById?(id: string): Promise<PaymentUser | null>;
  findAll?(page?: number, limit?: number): Promise<[PaymentUser[], number]>;
}

export const TRANSFI_USER_REPOSITORY_PORT = Symbol(
  'TRANSFI_USER_REPOSITORY_PORT',
);
