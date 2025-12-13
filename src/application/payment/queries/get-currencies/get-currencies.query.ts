import { IQuery } from '@nestjs/cqrs';

export class GetCurrenciesQuery implements IQuery {
  constructor(
    public readonly direction: 'deposit' | 'withdraw',
    public readonly page?: number,
    public readonly limit?: number,
  ) {}
}
