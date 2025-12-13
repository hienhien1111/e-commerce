import { BaseDomainModel } from '@/shared/domain/base-domain-model';
import { OrderStatus } from '@/domain/value-objects/order-status';

export interface PaymentOrderEssentialProps {
  orderId: string;
  externalOrderId?: string | null;
  transfiUserId: string;
  orderType: 'payin' | 'payout';
  currencyType: 'fiat' | 'crypto';
  sourceCurrency: string;
  destinationCurrency: string;
  sourceAmount: number;
  destinationAmount?: number | null;
  fee: number;
  rate?: number | null;
  paymentMethod: string;
  status: OrderStatus;
  paymentUrl?: string | null;
  transactionHash?: string | null;
  failureReason?: string | null;
  callbackUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  completedAt?: Date | null;
}

export class PaymentOrder extends BaseDomainModel<PaymentOrderEssentialProps> {
  private constructor(
    props: PaymentOrderEssentialProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    shouldValidate = true,
  ) {
    super(props, id, createdAt, updatedAt);
    if (shouldValidate) {
      this.validate();
    }
  }

  static _create(
    props: PaymentOrderEssentialProps,
    id: string,
    createdAt?: Date,
    updatedAt?: Date,
    shouldValidate = true,
  ): PaymentOrder {
    return new PaymentOrder(props, id, createdAt, updatedAt, shouldValidate);
  }

  private validate(): void {
    if (!this.props.orderId) {
      throw new Error('Order ID is required');
    }
    if (!this.props.transfiUserId) {
      throw new Error('Transfi User ID is required');
    }
    if (!this.props.sourceCurrency) {
      throw new Error('Source currency is required');
    }
    if (!this.props.destinationCurrency) {
      throw new Error('Destination currency is required');
    }
    if (this.props.sourceAmount <= 0) {
      throw new Error('Source amount must be greater than 0');
    }
    if (!this.props.paymentMethod) {
      throw new Error('Payment method is required');
    }
  }

  get orderId(): PaymentOrderEssentialProps['orderId'] {
    return this.props.orderId;
  }

  get externalOrderId(): PaymentOrderEssentialProps['externalOrderId'] {
    return this.props.externalOrderId;
  }

  get transfiUserId(): PaymentOrderEssentialProps['transfiUserId'] {
    return this.props.transfiUserId;
  }

  get orderType(): PaymentOrderEssentialProps['orderType'] {
    return this.props.orderType;
  }

  get currencyType(): PaymentOrderEssentialProps['currencyType'] {
    return this.props.currencyType;
  }

  get sourceCurrency(): PaymentOrderEssentialProps['sourceCurrency'] {
    return this.props.sourceCurrency;
  }

  get destinationCurrency(): PaymentOrderEssentialProps['destinationCurrency'] {
    return this.props.destinationCurrency;
  }

  get sourceAmount(): PaymentOrderEssentialProps['sourceAmount'] {
    return this.props.sourceAmount;
  }

  get destinationAmount(): PaymentOrderEssentialProps['destinationAmount'] {
    return this.props.destinationAmount;
  }

  get fee(): PaymentOrderEssentialProps['fee'] {
    return this.props.fee;
  }

  get rate(): PaymentOrderEssentialProps['rate'] {
    return this.props.rate;
  }

  get paymentMethod(): PaymentOrderEssentialProps['paymentMethod'] {
    return this.props.paymentMethod;
  }

  get status(): PaymentOrderEssentialProps['status'] {
    return this.props.status;
  }

  get paymentUrl(): PaymentOrderEssentialProps['paymentUrl'] {
    return this.props.paymentUrl;
  }

  get transactionHash(): PaymentOrderEssentialProps['transactionHash'] {
    return this.props.transactionHash;
  }

  get failureReason(): PaymentOrderEssentialProps['failureReason'] {
    return this.props.failureReason;
  }

  get callbackUrl(): PaymentOrderEssentialProps['callbackUrl'] {
    return this.props.callbackUrl;
  }

  get metadata(): PaymentOrderEssentialProps['metadata'] {
    return this.props.metadata;
  }

  get completedAt(): PaymentOrderEssentialProps['completedAt'] {
    return this.props.completedAt;
  }

  markAsCompleted(transactionHash?: string, destinationAmount?: number): void {
    this.props.status = OrderStatus.COMPLETED;
    if (transactionHash) {
      this.props.transactionHash = transactionHash;
    }
    if (destinationAmount !== undefined) {
      this.props.destinationAmount = destinationAmount;
    }
    this.props.completedAt = new Date();
    this.touch();
  }

  markAsFailed(failureReason: string): void {
    this.props.status = OrderStatus.FAILED;
    this.props.failureReason = failureReason;
    this.touch();
  }

  markAsProcessing(): void {
    this.props.status = OrderStatus.PROCESSING;
    this.touch();
  }

  markAsCancelled(): void {
    this.props.status = OrderStatus.CANCELLED;
    this.touch();
  }

  updatePaymentUrl(paymentUrl: string): void {
    this.props.paymentUrl = paymentUrl;
    this.touch();
  }

  updateDestinationAmount(destinationAmount: number): void {
    this.props.destinationAmount = destinationAmount;
    this.touch();
  }

  updateRate(rate: number): void {
    this.props.rate = rate;
    this.touch();
  }

  toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      orderId: this.orderId,
      externalOrderId: this.externalOrderId ?? null,
      transfiUserId: this.transfiUserId,
      orderType: this.orderType,
      currencyType: this.currencyType,
      sourceCurrency: this.sourceCurrency,
      destinationCurrency: this.destinationCurrency,
      sourceAmount: this.sourceAmount,
      destinationAmount: this.destinationAmount ?? null,
      fee: this.fee,
      rate: this.rate ?? null,
      paymentMethod: this.paymentMethod,
      status: this.status.toString(),
      paymentUrl: this.paymentUrl ?? null,
      transactionHash: this.transactionHash ?? null,
      failureReason: this.failureReason ?? null,
      callbackUrl: this.callbackUrl ?? null,
      metadata: this.metadata ?? null,
      completedAt: this.completedAt ?? null,
    };
  }
}
