import { PaymentOrder } from '@/domain/entities/payment-order';
import { OrderStatus } from '@/domain/value-objects/order-status';
import { TransfiOrderEntity } from '@/infrastructure/persistence/entities/transfi-order.entity';

export class TransfiOrderMapper {
  static toDomain(raw: TransfiOrderEntity): PaymentOrder {
    return PaymentOrder._create(
      {
        orderId: raw.orderId,
        externalOrderId: raw.externalOrderId ?? null,
        transfiUserId: raw.transfiUserId,
        orderType: raw.orderType,
        currencyType: raw.currencyType,
        sourceCurrency: raw.sourceCurrency,
        destinationCurrency: raw.destinationCurrency,
        sourceAmount: raw.sourceAmount,
        destinationAmount: raw.destinationAmount ?? null,
        fee: raw.fee,
        rate: raw.rate ?? null,
        paymentMethod: raw.paymentMethod,
        status: OrderStatus.fromString(raw.status),
        paymentUrl: raw.paymentUrl ?? null,
        transactionHash: raw.transactionHash ?? null,
        failureReason: raw.failureReason ?? null,
        callbackUrl: raw.callbackUrl ?? null,
        metadata: raw.metadata ?? null,
        completedAt: raw.completedAt ?? null,
      },
      raw.id,
      raw.createdAt,
      raw.updatedAt,
      true,
    );
  }
}
