import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { NotFoundException, Inject, HttpStatus } from '@nestjs/common';
import { ConfirmEmailCommand } from './confirm-email.command';
import { ConfirmEmailResult } from './confirm-email.result';
import { EmailConfirmedEvent } from '@/domain/events/email-confirmed.event';
import type { UserRepositoryPort } from '../../ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { AuthEmailTokenService } from '@/application/identity/services/auth-email-token.service';

@CommandHandler(ConfirmEmailCommand)
export class ConfirmEmailHandler
  implements ICommandHandler<ConfirmEmailCommand>
{
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly eventBus: EventBus,
    private readonly tokenService: AuthEmailTokenService,
  ) {}

  async execute(command: ConfirmEmailCommand): Promise<ConfirmEmailResult> {
    const { hash } = command;
    const { sub: userId } = await this.tokenService.verify(
      hash,
      'verify-email',
    );

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    const verifiedUser = await this.userRepository.update(user.id, {
      verifiedAt: new Date(),
    });
    if (!verifiedUser) {
      throw new NotFoundException({ error: 'notFound' });
    }

    await this.eventBus.publish(new EmailConfirmedEvent(verifiedUser));
  }
}
