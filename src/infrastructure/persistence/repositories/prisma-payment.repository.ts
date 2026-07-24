import { Injectable } from '@nestjs/common';
import type { PaymentRepositoryPort } from '@/application/payment/ports/payment.repository.port';
import { Payment } from '@/domain/entities/payment';
import { PaymentMapper } from '@/infrastructure/persistence/mappers/payment.mapper';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { NullableType } from '@/utils/types/nullable.type';

@Injectable()
export class PrismaPaymentRepository implements PaymentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByOrderId(orderId: string): Promise<NullableType<Payment>> {
    const row = await this.prisma.payment.findUnique({ where: { orderId } });
    return row ? PaymentMapper.toDomain(row) : null;
  }

  async create(payment: Payment): Promise<Payment> {
    const created = await this.prisma.payment.create({
      data: PaymentMapper.toPersistence(payment),
    });
    return PaymentMapper.toDomain(created);
  }

  async save(payment: Payment): Promise<Payment> {
    const saved = await this.prisma.payment.update({
      where: { id: payment.id },
      data: PaymentMapper.toPersistence(payment),
    });
    return PaymentMapper.toDomain(saved);
  }
}
