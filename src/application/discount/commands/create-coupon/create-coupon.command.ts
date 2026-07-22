import { ICommand } from '@nestjs/cqrs';
import { CreateCouponPayload } from '@/application/discount/types/coupon-payload.types';

export class CreateCouponCommand implements ICommand {
  constructor(public readonly payload: CreateCouponPayload) {}
}
