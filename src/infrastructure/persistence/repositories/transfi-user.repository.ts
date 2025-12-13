import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaymentUser,
  type PaymentUserEssentialProps,
} from '@/domain/entities/payment-user';
import type { PaymentUserRepositoryPort } from '@/application/payment/ports/transfi-user-repository.port';
import { TransfiUserEntity } from '@/infrastructure/persistence/entities/transfi-user.entity';
import { TransfiUserMapper } from '@/infrastructure/persistence/mappers/transfi-user.mapper';

@Injectable()
export class TypeOrmTransfiUserRepository implements PaymentUserRepositoryPort {
  constructor(
    @InjectRepository(TransfiUserEntity)
    private readonly repo: Repository<TransfiUserEntity>,
  ) {}

  async findByUserId(userId: string): Promise<PaymentUser | null> {
    const entity = await this.repo.findOne({ where: { userId } });
    return entity ? TransfiUserMapper.toDomain(entity) : null;
  }

  async findByPaymentUserId(
    transfiUserId: string,
  ): Promise<PaymentUser | null> {
    const entity = await this.repo.findOne({ where: { transfiUserId } });
    return entity ? TransfiUserMapper.toDomain(entity) : null;
  }

  async create(user: Partial<PaymentUserEssentialProps>): Promise<PaymentUser> {
    if (!user.userId) throw new Error('userId is required');
    if (!user.transfiUserId) throw new Error('transfiUserId is required');
    if (!user.userType) throw new Error('userType is required');
    if (!user.email) throw new Error('email is required');
    if (!user.kycStatus) throw new Error('kycStatus is required');

    const entity = this.repo.create({
      userId: user.userId,
      transfiUserId: user.transfiUserId,
      userType: user.userType,
      email: user.email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      companyName: user.companyName ?? null,
      kycStatus: user.kycStatus.toString(),
      kycLevel: user.kycLevel ?? 0,
      metadata: user.metadata ?? null,
    });

    const saved = await this.repo.save(entity);
    return TransfiUserMapper.toDomain(saved);
  }

  async update(
    id: string,
    user: Partial<PaymentUserEssentialProps>,
  ): Promise<void> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return;

    if (user.email !== undefined) entity.email = user.email;
    if (user.firstName !== undefined) entity.firstName = user.firstName ?? null;
    if (user.lastName !== undefined) entity.lastName = user.lastName ?? null;
    if (user.companyName !== undefined)
      entity.companyName = user.companyName ?? null;
    if (user.kycStatus !== undefined)
      entity.kycStatus = user.kycStatus.toString();
    if (user.kycLevel !== undefined) entity.kycLevel = user.kycLevel;
    if (user.metadata !== undefined) entity.metadata = user.metadata ?? null;

    await this.repo.save(entity);
  }
}
