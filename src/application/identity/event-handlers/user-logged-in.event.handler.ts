import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { UserLoggedInEvent } from '@/domain/events/user-logged-in.event';

@EventsHandler(UserLoggedInEvent)
export class UserLoggedInEventHandler
  implements IEventHandler<UserLoggedInEvent>
{
  constructor() {}

  async handle(event: UserLoggedInEvent): Promise<void> {
    const { user, sessionId } = event;
    // Handle side effects when user logs in
    // For example: Update last login time, log activity, etc.
    console.log(`User logged in: ${user.email}, session: ${sessionId}`);
    // TODO: Add actual side effects like:
    // - Update last login timestamp
    // - Log login activity
    // - Send security notification if needed
  }
}
