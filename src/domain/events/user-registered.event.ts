import { User } from '@/domain/entities/user';

export class UserRegisteredEvent {
  constructor(public readonly user: User) {}
}
