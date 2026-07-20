import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import type { UserRepositoryPort } from '@/application/identity/ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '@/application/identity/ports/user/user.repository.port.token';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { AuthEmailService } from '@/application/identity/services/auth-email.service';
import { ResendConfirmationCommand } from './resend-confirmation.command';

@CommandHandler(ResendConfirmationCommand)
export class ResendConfirmationHandler
  implements ICommandHandler<ResendConfirmationCommand>
{
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async execute(command: ResendConfirmationCommand): Promise<void> {
    const user = await this.userRepository.findByEmail(command.email);
    if (
      !user ||
      user.provider !== AuthProvidersEnum.EMAIL ||
      user.verifiedAt ||
      !user.email
    ) {
      return;
    }

    try {
      await this.authEmailService.sendVerification(user.id, user.email);
    } catch {
      // Keep the public response generic to prevent account enumeration.
    }
  }
}
