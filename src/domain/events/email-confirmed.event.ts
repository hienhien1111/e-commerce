import { User } from '@/domain/entities/user';

export class EmailConfirmedEvent {
  constructor(public readonly user: User) {}
}
