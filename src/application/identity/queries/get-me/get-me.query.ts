import { IQuery } from '@nestjs/cqrs';
import { User } from '@/domain/entities/user';

export class GetMeQuery implements IQuery {
  constructor(public readonly userId: User['id']) {}
}
