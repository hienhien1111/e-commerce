import { IQuery } from '@nestjs/cqrs';

export class GetPaymentMethodsQuery implements IQuery {
  constructor(
    public readonly currency: string,
    public readonly direction: 'deposit' | 'withdraw',
    public readonly page?: number,
    public readonly limit?: number,
    public readonly logoFormat?: string,
  ) {}
}
