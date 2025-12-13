import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  Inject,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { UpdateUserCommand } from './update-user.command';
import { UpdateUserResult } from './update-user.result';
import type { UserRepositoryPort } from '../../ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import type { PasswordHasherPort } from '../../ports/password-hasher/password-hasher.port';
import { PASSWORD_HASHER_PORT } from '../../ports/password-hasher/password-hasher.port.token';

@CommandHandler(UpdateUserCommand)
export class UpdateUserHandler implements ICommandHandler<UpdateUserCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(command: UpdateUserCommand): Promise<UpdateUserResult> {
    const { id, payload } = command;
    let password: string | undefined = undefined;

    if (payload.password) {
      const userObject = await this.userRepository.findById(id);

      if (userObject && userObject?.password !== payload.password) {
        password = await this.passwordHasher.hash(payload.password);
      }
    }

    let email: string | null | undefined = undefined;

    if (payload.email) {
      const userObject = await this.userRepository.findByEmail(payload.email);

      if (userObject && userObject.id !== id) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }

      email = payload.email;
    } else if (payload.email === null) {
      email = null;
    }

    return this.userRepository.update(id, {
      firstName: payload.firstName ?? undefined,
      lastName: payload.lastName ?? undefined,
      email: email ?? undefined,
      password,
      roleId: payload.role?.id ?? undefined,
      provider: payload.provider,
      socialId: payload.socialId ?? undefined,
    });
  }
}
