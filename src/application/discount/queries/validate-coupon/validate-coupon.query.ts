import { IQuery } from '@nestjs/cqrs';

export class ValidateCouponQuery implements IQuery {
  constructor(
    public readonly code: string,
    public readonly total: number,
  ) {}
}
