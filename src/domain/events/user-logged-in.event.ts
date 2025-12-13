import { IEvent } from '@nestjs/cqrs';
import { User } from '@/domain/entities/user';

export class UserLoggedInEvent implements IEvent {
  constructor(
    public readonly user: User,
    public readonly sessionId: string,
  ) {}
}
