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

const coupon = (overrides: Record<string, unknown> = {}) =>
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
  it('normalizes a new code and rejects duplicates, invalid expiry, and invalid domain values', async () => {
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
    ).resolves.toMatchObject({ code: 'SALE10', usedCount: 0 });
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
          discountType: DiscountTypeEnum.FIXED_AMOUNT,
          discountValue: 10_000,
          expiresAt: new Date(Date.now() - 1),
        },
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    await expect(
      handler.execute({
        payload: {
          code: 'bad',
          discountType: DiscountTypeEnum.PERCENTAGE,
          discountValue: 0,
        },
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('deactivates only an existing coupon', async () => {
    const target = coupon();
    const repository = {
      findById: jest.fn().mockResolvedValue(target),
      save: jest.fn().mockImplementation(async (value) => value),
    };
    const handler = new DeactivateCouponHandler(repository as never);

    await expect(handler.execute({ id: target.id })).resolves.toMatchObject({
      isActive: false,
    });
    expect(repository.save).toHaveBeenCalledWith(target);
    repository.findById.mockResolvedValueOnce(null);
    await expect(handler.execute({ id: 'missing' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates code safely and protects expiry and used-count limits', async () => {
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
    expect(repository.findByCode).toHaveBeenCalledWith('NEW-CODE');
    await expect(
      handler.execute({ id: target.id, payload: { maxUsage: 0 } }),
    ).rejects.toThrow(UnprocessableEntityException);
    await expect(
      handler.execute({
        id: target.id,
        payload: { expiresAt: new Date(Date.now() - 1) },
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    repository.findByCode.mockResolvedValueOnce(coupon({ id: 'other' }));
    await expect(
      handler.execute({ id: target.id, payload: { code: 'OTHER' } }),
    ).rejects.toThrow(ConflictException);
    repository.findById.mockResolvedValueOnce(null);
    await expect(
      handler.execute({ id: 'missing', payload: {} }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns coupon reads and list delegation while reporting a missing coupon', async () => {
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

  it('returns every invalid validation reason without throwing and calculates a valid discount', async () => {
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
      reason: 'INACTIVE',
    });
    repository.findById.mockResolvedValueOnce(
      coupon({ expiresAt: new Date(Date.now() - 1) }),
    );
    await expect(
      service.validateById('coupon-1', 100_000),
    ).resolves.toMatchObject({
      reason: 'EXPIRED',
    });
    repository.findById.mockResolvedValueOnce(coupon({ usedCount: 2 }));
    await expect(
      service.validateById('coupon-1', 100_000),
    ).resolves.toMatchObject({
      reason: 'MAX_USAGE_REACHED',
    });
    repository.findById.mockResolvedValueOnce(coupon());
    await expect(
      service.validateById('coupon-1', 99_999),
    ).resolves.toMatchObject({
      reason: 'ORDER_BELOW_MINIMUM',
    });
    repository.findByCode.mockResolvedValueOnce(coupon());
    await expect(
      service.validateByCode(' sale10 ', 600_000),
    ).resolves.toMatchObject({
      valid: true,
      discountAmount: 50_000,
      coupon: { code: 'SALE10' },
    });
    expect(repository.findByCode).toHaveBeenLastCalledWith('SALE10');
  });
});
