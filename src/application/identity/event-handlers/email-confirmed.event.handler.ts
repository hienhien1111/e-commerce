import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { EmailConfirmedEvent } from '@/domain/events/email-confirmed.event';

@EventsHandler(EmailConfirmedEvent)
export class EmailConfirmedEventHandler
  implements IEventHandler<EmailConfirmedEvent>
{
  constructor() {}

  async handle(event: EmailConfirmedEvent): Promise<void> {
    const { user } = event;
    // Handle side effects when email is confirmed
    // For example: Send confirmation notification, unlock features, etc.
    console.log(`Email confirmed for user: ${user.email}`);
    // TODO: Add actual side effects like:
    // - Send confirmation notification
    // - Unlock email-required features
    // - Update user status
  }
}
