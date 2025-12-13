import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentOrder,
  type PaymentOrderEssentialProps,
} from '@/domain/entities/payment-order';
import type { PaymentOrderRepositoryPort } from '@/application/payment/ports/transfi-order-repository.port';
import { TransfiOrderEntity } from '@/infrastructure/persistence/entities/transfi-order.entity';
import { TransfiOrderMapper } from '@/infrastructure/persistence/mappers/transfi-order.mapper';

@Injectable()
export class TypeOrmTransfiOrderRepository
  implements PaymentOrderRepositoryPort
{
  constructor(
    @InjectRepository(TransfiOrderEntity)
    private readonly repo: Repository<TransfiOrderEntity>,
  ) {}

  async findById(id: string): Promise<PaymentOrder | null> {
    const entity = await this.repo.findOne({ where: { id } });
    return entity ? TransfiOrderMapper.toDomain(entity) : null;
  }

  async findByOrderId(orderId: string): Promise<PaymentOrder | null> {
    const entity = await this.repo.findOne({ where: { orderId } });
    return entity ? TransfiOrderMapper.toDomain(entity) : null;
  }

  async findByExternalOrderId(
    externalOrderId: string,
  ): Promise<PaymentOrder | null> {
    const entity = await this.repo.findOne({ where: { externalOrderId } });
    return entity ? TransfiOrderMapper.toDomain(entity) : null;
  }

  async findByPaymentUserId(transfiUserId: string): Promise<PaymentOrder[]> {
    const entities = await this.repo.find({ where: { transfiUserId } });
    return entities.map((e) => TransfiOrderMapper.toDomain(e));
  }

  async create(
    order: Partial<PaymentOrderEssentialProps>,
  ): Promise<PaymentOrder> {
    if (!order.orderId) throw new Error('orderId is required');
    if (!order.transfiUserId) throw new Error('transfiUserId is required');
    if (!order.orderType) throw new Error('orderType is required');
    if (!order.currencyType) throw new Error('currencyType is required');
    if (!order.sourceCurrency) throw new Error('sourceCurrency is required');
    if (!order.destinationCurrency)
      throw new Error('destinationCurrency is required');
    if (order.sourceAmount === undefined)
      throw new Error('sourceAmount is required');
    if (order.fee === undefined) throw new Error('fee is required');
    if (!order.paymentMethod) throw new Error('paymentMethod is required');
    if (!order.status) throw new Error('status is required');

    const entity = this.repo.create({
      orderId: order.orderId,
      externalOrderId: order.externalOrderId ?? null,
      transfiUserId: order.transfiUserId,
      orderType: order.orderType,
      currencyType: order.currencyType,
      sourceCurrency: order.sourceCurrency,
      destinationCurrency: order.destinationCurrency,
      sourceAmount: order.sourceAmount,
      destinationAmount: order.destinationAmount ?? null,
      fee: order.fee,
      rate: order.rate ?? null,
      paymentMethod: order.paymentMethod,
      status: order.status.toString(),
      paymentUrl: order.paymentUrl ?? null,
      transactionHash: order.transactionHash ?? null,
      failureReason: order.failureReason ?? null,
      callbackUrl: order.callbackUrl ?? null,
      metadata: order.metadata ?? null,
      completedAt: order.completedAt ?? null,
    });

    const saved = await this.repo.save(entity);
    return TransfiOrderMapper.toDomain(saved);
  }

  async update(
    id: string,
    order: Partial<PaymentOrderEssentialProps>,
  ): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return;

    if (order.externalOrderId !== undefined)
      entity.externalOrderId = order.externalOrderId ?? null;
    if (order.transfiUserId !== undefined)
      entity.transfiUserId = order.transfiUserId;
    if (order.orderType !== undefined) entity.orderType = order.orderType;
    if (order.currencyType !== undefined)
      entity.currencyType = order.currencyType;
    if (order.sourceCurrency !== undefined)
      entity.sourceCurrency = order.sourceCurrency;
    if (order.destinationCurrency !== undefined)
      entity.destinationCurrency = order.destinationCurrency;
    if (order.sourceAmount !== undefined)
      entity.sourceAmount = order.sourceAmount;
    if (order.destinationAmount !== undefined)
      entity.destinationAmount = order.destinationAmount ?? null;
    if (order.fee !== undefined) entity.fee = order.fee;
    if (order.rate !== undefined) entity.rate = order.rate ?? null;
    if (order.paymentMethod !== undefined)
      entity.paymentMethod = order.paymentMethod;
    if (order.status !== undefined) entity.status = order.status.toString();
    if (order.paymentUrl !== undefined)
      entity.paymentUrl = order.paymentUrl ?? null;
    if (order.transactionHash !== undefined)
      entity.transactionHash = order.transactionHash ?? null;
    if (order.failureReason !== undefined)
      entity.failureReason = order.failureReason ?? null;
    if (order.callbackUrl !== undefined)
      entity.callbackUrl = order.callbackUrl ?? null;
    if (order.metadata !== undefined) entity.metadata = order.metadata ?? null;
    if (order.completedAt !== undefined)
      entity.completedAt = order.completedAt ?? null;

    await this.repo.save(entity);
  }
}
