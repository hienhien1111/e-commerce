import type { Payment as PrismaPayment } from '@/generated/prisma/client';
import { Payment, PaymentMetadata } from '@/domain/entities/payment';
import { PaymentFactory } from '@/domain/factories/payment.factory';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { Prisma } from '@/generated/prisma/client';

export class PaymentMapper {
  static toDomain(raw: PrismaPayment): Payment {
    const metadata = raw.metadata as PaymentMetadata | null;
    return PaymentFactory.reconstitute({
      id: raw.id,
      orderId: raw.orderId,
      provider: raw.provider,
      amount: raw.amount.toNumber(),
      currency: raw.currency,
      status: raw.status as PaymentStatusEnum,
      providerOrderId: raw.providerOrderId,
      providerTransId: raw.providerTransId,
      payUrl: raw.payUrl,
      qrCodeUrl: raw.qrCodeUrl,
      deeplink: raw.deeplink,
      metadata: { attempts: [], ...(metadata ?? {}) },
      expiresAt: raw.expiresAt,
      paidAt: raw.paidAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(payment: Payment): Prisma.PaymentUncheckedCreateInput {
    return {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      providerOrderId: payment.providerOrderId,
      providerTransId: payment.providerTransId,
      payUrl: payment.payUrl,
      qrCodeUrl: payment.qrCodeUrl,
      deeplink: payment.deeplink,
      metadata: payment.metadata as unknown as Prisma.InputJsonValue,
      expiresAt: payment.expiresAt,
      paidAt: payment.paidAt,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
