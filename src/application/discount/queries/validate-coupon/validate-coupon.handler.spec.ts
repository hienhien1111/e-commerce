import { Test } from '@nestjs/testing';
import { ValidateCouponHandler } from './validate-coupon.handler';
import { ValidateCouponQuery } from './validate-coupon.query';
import { COUPON_VALIDATION_PORT } from '@/application/discount/ports/coupon-validation.port.token';

describe('ValidateCouponHandler', () => {
  it('returns a valid calculation and a non-throwing invalid result', async () => {
    const validation = { validateByCode: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        ValidateCouponHandler,
        { provide: COUPON_VALIDATION_PORT, useValue: validation },
      ],
    }).compile();
    const handler = module.get(ValidateCouponHandler);

    validation.validateByCode.mockResolvedValueOnce({
      valid: true,
      discountAmount: 50000,
    });
    await expect(
      handler.execute(new ValidateCouponQuery('sale10', 500000)),
    ).resolves.toEqual({ valid: true, discountAmount: 50000 });

    validation.validateByCode.mockResolvedValueOnce({
      valid: false,
      discountAmount: 0,
      reason: 'EXPIRED',
    });
    await expect(
      handler.execute(new ValidateCouponQuery('expired', 500000)),
    ).resolves.toEqual({ valid: false, discountAmount: 0, reason: 'EXPIRED' });
  });
});
