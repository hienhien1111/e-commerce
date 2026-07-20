import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { ConfirmNewEmailCommand } from './confirm-new-email.command';
import { ConfirmNewEmailResult } from './confirm-new-email.result';
import type { UserRepositoryPort } from '../../ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import type { SessionRepositoryPort } from '../../ports/session/session.repository.port';
import { SESSION_REPOSITORY_PORT } from '../../ports/session/session.repository.port.token';
import { AuthEmailTokenService } from '@/application/identity/services/auth-email-token.service';

@CommandHandler(ConfirmNewEmailCommand)
export class ConfirmNewEmailHandler
  implements ICommandHandler<ConfirmNewEmailCommand>
{
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: SessionRepositoryPort,
    private readonly tokenService: AuthEmailTokenService,
  ) {}

  async execute(
    command: ConfirmNewEmailCommand,
  ): Promise<ConfirmNewEmailResult> {
    const { hash } = command;
    const { sub: userId, newEmail } = await this.tokenService.verify(
      hash,
      'verify-new-email',
    );
    if (!newEmail) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { hash: 'invalidHash' },
      });
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    const existingUser = await this.userRepository.findByEmail(newEmail);
    if (existingUser && existingUser.id !== user.id) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { email: 'emailAlreadyExists' },
      });
    }

    await this.userRepository.update(user.id, {
      email: newEmail,
      verifiedAt: new Date(),
    });
    await this.sessionRepository.deleteByUserId({ userId: user.id });
  }
}
