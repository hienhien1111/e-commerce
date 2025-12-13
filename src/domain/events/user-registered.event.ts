import { IEvent } from '@nestjs/cqrs';
import { User } from '@/domain/entities/user';

export class UserRegisteredEvent implements IEvent {
  constructor(public readonly user: User) {}
}
