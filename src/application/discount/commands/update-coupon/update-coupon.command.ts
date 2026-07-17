import { ICommand } from '@nestjs/cqrs';
import { UpdateCouponPayload } from '@/application/discount/types/coupon-payload.types';

export class UpdateCouponCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly payload: UpdateCouponPayload,
  ) {}
}
