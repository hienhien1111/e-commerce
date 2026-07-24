import { IQuery } from '@nestjs/cqrs';

export class GetAdminProductQuery implements IQuery {
  constructor(public readonly id: string) {}
}
