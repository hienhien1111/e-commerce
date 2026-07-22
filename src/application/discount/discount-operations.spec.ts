import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateCouponHandler } from '@/application/discount/commands/create-coupon/create-coupon.handler';
import { DeactivateCouponHandler } from '@/application/discount/commands/deactivate-coupon/deactivate-coupon.handler';
import { UpdateCouponHandler } from '@/application/discount/commands/update-coupon/update-coupon.handler';
import { GetCouponHandler } from '@/application/discount/queries/get-coupon/get-coupon.handler';
import { GetCouponsHandler } from '@/application/discount/queries/get-coupons/get-coupons.handler';
import { CouponValidationService } from '@/application/discount/services/coupon-validation.service';
import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';
import { CouponFactory } from '@/domain/factories/coupon.factory';

const coupon = (overrides: Partial<Record<string, unknown>> = {}) =>
  CouponFactory.create({
    id: 'coupon-1',
    code: 'SALE10',
    discountType: DiscountTypeEnum.PERCENTAGE,
    discountValue: 10,
    maxDiscount: 50_000,
    minOrderAmount: 100_000,
    maxUsage: 2,
    usedCount: 0,
    expiresAt: new Date(Date.now() + 60_000),
    isActive: true,
    ...overrides,
  } as never);

describe('Discount application operations', () => {
  it('normalizes a coupon code and rejects duplicates or past expiries', async () => {
    const repository = {
      findByCode: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(async (value) => value),
    };
    const handler = new CreateCouponHandler(repository as never);

    await expect(
      handler.execute({
        payload: {
          code: ' sale10 ',
          discountType: DiscountTypeEnum.PERCENTAGE,
          discountValue: 10,
        },
      }),
    ).resolves.toMatchObject({ code: 'SALE10' });
    repository.findByCode.mockResolvedValueOnce(coupon());
    await expect(
      handler.execute({
        payload: {
          code: 'sale10',
          discountType: DiscountTypeEnum.PERCENTAGE,
          discountValue: 10,
        },
      }),
    ).rejects.toThrow(ConflictException);
    repository.findByCode.mockResolvedValueOnce(null);
    await expect(
      handler.execute({
        payload: {
          code: 'late',
          discountType: DiscountTypeEnum.FIXED,
          discountValue: 10_000,
          expiresAt: new Date(Date.now() - 1),
        },
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('deactivates an existing coupon and reports a missing coupon', async () => {
    const target = coupon();
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const handler = new DeactivateCouponHandler(repository as never);

    await expect(handler.execute({ id: target.id })).resolves.toMatchObject({
      isActive: false,
    });
    repository.findById.mockResolvedValueOnce(null);
    await expect(handler.execute({ id: 'missing' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates an available coupon code and protects usage counts', async () => {
    const target = coupon({ usedCount: 1 });
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      findByCode: jest.fn().mockResolvedValue(null),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const handler = new UpdateCouponHandler(repository as never);

    await expect(
      handler.execute({ id: target.id, payload: { code: ' new-code ' } }),
    ).resolves.toMatchObject({ code: 'NEW-CODE' });
    await expect(
      handler.execute({ id: target.id, payload: { maxUsage: 0 } }),
    ).rejects.toThrow(UnprocessableEntityException);
    repository.findByCode.mockResolvedValueOnce(coupon({ id: 'other' }));
    await expect(
      handler.execute({ id: target.id, payload: { code: 'OTHER' } }),
    ).rejects.toThrow(ConflictException);
  });

  it('maps coupon validation state to non-throwing results', async () => {
    const repository = { findByCode: jest.fn(), findById: jest.fn() };
    const service = new CouponValidationService(repository as never);

    repository.findByCode.mockResolvedValueOnce(null);
    await expect(service.validateByCode(' missing ', 100_000)).resolves.toEqual(
      {
        valid: false,
        discountAmount: 0,
        reason: 'NOT_FOUND',
      },
    );
    repository.findById.mockResolvedValueOnce(coupon({ isActive: false }));
    await expect(
      service.validateById('coupon-1', 100_000),
    ).resolves.toMatchObject({
      valid: false,
      reason: 'INACTIVE',
    });
    repository.findById.mockResolvedValueOnce(coupon());
    await expect(
      service.validateById('coupon-1', 200_000),
    ).resolves.toMatchObject({
      valid: true,
      discountAmount: 20_000,
    });
  });

  it('returns one coupon and delegates coupon listing', async () => {
    const target = coupon();
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      findAll: jest.fn().mockResolvedValue([target]),
    };

    await expect(
      new GetCouponHandler(repository as never).execute({ id: target.id }),
    ).resolves.toBe(target);
    await expect(
      new GetCouponsHandler(repository as never).execute({}),
    ).resolves.toEqual([target]);
    repository.findById.mockResolvedValueOnce(null);
    await expect(
      new GetCouponHandler(repository as never).execute({ id: 'missing' }),
    ).rejects.toThrow(NotFoundException);
  });
});
