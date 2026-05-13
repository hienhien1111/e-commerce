import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Inject,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CreateUserCommand } from './create-user.command';
import { CreateUserResult } from './create-user.result';
import type { UserRepositoryPort } from '../../ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import type { PasswordHasherPort } from '../../ports/password-hasher/password-hasher.port';
import { PASSWORD_HASHER_PORT } from '../../ports/password-hasher/password-hasher.port.token';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';

@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: CreateUserCommand): Promise<CreateUserResult> {
    const { payload } = command;
    let password: string | null = null;

    if (payload.password) {
      password = await this.passwordHasher.hash(payload.password);
    }

    let email: string | null = null;

    if (payload.email) {
      const userObject = await this.userRepository.findByEmail(payload.email);
      if (userObject) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }
      email = payload.email;
    }

    return this.userRepository.create({
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      email: email,
      password: password,
      roleId: payload.role?.id ?? null,
      provider: payload.provider ?? AuthProvidersEnum.EMAIL,
      socialId: payload.socialId ?? null,
    });
  }
}
