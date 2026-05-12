import { User } from '@/domain/entities/user';

export class UserLoggedInEvent {
  constructor(
    public readonly user: User,
    public readonly sessionId: string,
  ) {}
}
