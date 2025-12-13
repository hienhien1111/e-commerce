import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  HttpStatus,
  NotFoundException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConfirmNewEmailCommand } from './confirm-new-email.command';
import { ConfirmNewEmailResult } from './confirm-new-email.result';
import { AllConfigType } from '@/config/config.type';
import { User } from '@/domain/entities/user';
import type { UserRepositoryPort } from '../../ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';

@CommandHandler(ConfirmNewEmailCommand)
export class ConfirmNewEmailHandler
  implements ICommandHandler<ConfirmNewEmailCommand>
{
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async execute(
    command: ConfirmNewEmailCommand,
  ): Promise<ConfirmNewEmailResult> {
    const { hash } = command;
    let userId: User['id'];
    let newEmail: User['email'];

    try {
      const jwtData = await this.jwtService.verifyAsync<{
        confirmEmailUserId: User['id'];
        newEmail: User['email'];
      }>(hash, {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
      });

      userId = jwtData.confirmEmailUserId;
      newEmail = jwtData.newEmail;
    } catch {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          hash: `invalidHash`,
        },
      });
    }

    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException({
        status: HttpStatus.NOT_FOUND,
        error: `notFound`,
      });
    }

    await this.userRepository.update(user.id, {
      email: newEmail,
    });
  }
}
