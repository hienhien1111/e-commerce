import { IQuery } from '@nestjs/cqrs';

export class GetPositionBySymbolQuery implements IQuery {
  constructor(
    public readonly userId: string,
    public readonly symbol: string,
  ) {}
}
