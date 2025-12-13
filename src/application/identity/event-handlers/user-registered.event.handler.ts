import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserRegisteredEvent } from '@/domain/events/user-registered.event';

@EventsHandler(UserRegisteredEvent)
export class UserRegisteredEventHandler
  implements IEventHandler<UserRegisteredEvent>
{
  constructor() {}

  async handle(event: UserRegisteredEvent): Promise<void> {
    const { user } = event;
    // Handle side effects when user registers
    // For example: Send welcome email, create default settings, etc.
    console.log(`User registered: ${user.email}`);
    // TODO: Add actual side effects like:
    // - Send welcome email
    // - Create user preferences
    // - Initialize user data
  }
}
