import { IQuery } from '@nestjs/cqrs';

export class GetPositionsQuery implements IQuery {
  constructor(public readonly userId: string) {}
}
