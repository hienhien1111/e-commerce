import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { ForgotPasswordCommand } from './forgot-password.command';
import { ForgotPasswordResult } from './forgot-password.result';
import type { UserRepositoryPort } from '../../ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { AuthEmailService } from '@/application/identity/services/auth-email.service';

@CommandHandler(ForgotPasswordCommand)
export class ForgotPasswordHandler
  implements ICommandHandler<ForgotPasswordCommand>
{
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async execute(command: ForgotPasswordCommand): Promise<ForgotPasswordResult> {
    const { email } = command;
    const user = await this.userRepository.findByEmail(email);

    if (user && user.provider === AuthProvidersEnum.EMAIL && user.email) {
      try {
        await this.authEmailService.sendPasswordReset(user.id, user.email);
      } catch {
        // Keep the public response generic to prevent account enumeration.
      }
    }
  }
}
