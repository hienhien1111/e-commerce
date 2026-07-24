import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import type { CouponRepositoryPort } from '@/application/discount/ports/coupon.repository.port';
import { Coupon } from '@/domain/entities/coupon';
import { CouponMapper } from '@/infrastructure/persistence/mappers/coupon.mapper';
import { NullableType } from '@/utils/types/nullable.type';

@Injectable()
export class PrismaCouponRepository implements CouponRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(coupon: Coupon): Promise<Coupon> {
    const created = await this.prisma.coupon.create({
      data: CouponMapper.toPersistence(coupon),
    });
    return CouponMapper.toDomain(created);
  }

  async save(coupon: Coupon): Promise<Coupon> {
    const saved = await this.prisma.coupon.update({
      where: { id: coupon.id },
      data: CouponMapper.toPersistence(coupon),
    });
    return CouponMapper.toDomain(saved);
  }

  async findById(id: string): Promise<NullableType<Coupon>> {
    const coupon = await this.prisma.coupon.findFirst({
      where: { id, deletedAt: null },
    });
    return coupon ? CouponMapper.toDomain(coupon) : null;
  }

  async findByCode(code: string): Promise<NullableType<Coupon>> {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code, deletedAt: null },
    });
    return coupon ? CouponMapper.toDomain(coupon) : null;
  }

  async findAll(): Promise<Coupon[]> {
    const coupons = await this.prisma.coupon.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return coupons.map((coupon) => CouponMapper.toDomain(coupon));
  }
}
