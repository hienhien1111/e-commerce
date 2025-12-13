import { IEvent } from '@nestjs/cqrs';
import { User } from '@/domain/entities/user';

export class EmailConfirmedEvent implements IEvent {
  constructor(public readonly user: User) {}
}
