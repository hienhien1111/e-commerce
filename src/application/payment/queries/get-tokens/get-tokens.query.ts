import { IQuery } from '@nestjs/cqrs';

export class GetTokensQuery implements IQuery {
  constructor(public readonly direction: 'deposit' | 'withdraw') {}
}
