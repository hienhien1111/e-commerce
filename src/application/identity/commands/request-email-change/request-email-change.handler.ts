import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject, UnprocessableEntityException } from '@nestjs/common';
import type { UserRepositoryPort } from '@/application/identity/ports/user/user.repository.port';
import type { PasswordHasherPort } from '@/application/identity/ports/password-hasher/password-hasher.port';
import { USER_REPOSITORY_PORT } from '@/application/identity/ports/user/user.repository.port.token';
import { PASSWORD_HASHER_PORT } from '@/application/identity/ports/password-hasher/password-hasher.port.token';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { AuthEmailService } from '@/application/identity/services/auth-email.service';
import { RequestEmailChangeCommand } from './request-email-change.command';

@CommandHandler(RequestEmailChangeCommand)
export class RequestEmailChangeHandler
  implements ICommandHandler<RequestEmailChangeCommand>
{
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async execute(command: RequestEmailChangeCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user || user.provider !== AuthProvidersEnum.EMAIL || !user.password) {
      throw new UnprocessableEntityException({
        errors: { email: 'emailChangeUnavailable' },
      });
    }

    const isCurrentPassword = await this.passwordHasher.compare(
      command.currentPassword,
      user.password,
    );
    if (!isCurrentPassword) {
      throw new UnprocessableEntityException({
        errors: { currentPassword: 'incorrectPassword' },
      });
    }

    if (user.email === command.email) {
      throw new UnprocessableEntityException({
        errors: { email: 'emailUnchanged' },
      });
    }

    const existingUser = await this.userRepository.findByEmail(command.email);
    if (existingUser && existingUser.id !== user.id) {
      throw new UnprocessableEntityException({
        errors: { email: 'emailAlreadyExists' },
      });
    }

    await this.authEmailService.sendNewEmailConfirmation(
      user.id,
      command.email,
    );
  }
}
