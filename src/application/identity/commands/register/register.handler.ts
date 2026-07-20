import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import {
  Inject,
  HttpStatus,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RegisterCommand } from './register.command';
import { RegisterResult } from './register.result';
import { RoleEnum } from '@/domain/enums/role.enum';
import { UserRegisteredEvent } from '@/domain/events/user-registered.event';
import type { RoleRepositoryPort } from '@/application/authorization/ports/role.repository.port';
import { ROLE_REPOSITORY_PORT } from '@/application/authorization/ports/tokens';
import type { UserRepositoryPort } from '../../ports/user/user.repository.port';
import type { PasswordHasherPort } from '../../ports/password-hasher/password-hasher.port';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { PASSWORD_HASHER_PORT } from '../../ports/password-hasher/password-hasher.port.token';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { AuthEmailService } from '@/application/identity/services/auth-email.service';

@CommandHandler(RegisterCommand)
export class RegisterHandler implements ICommandHandler<RegisterCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
    @Inject(ROLE_REPOSITORY_PORT)
    private readonly roleRepository: RoleRepositoryPort,
    private readonly eventBus: EventBus,
    private readonly authEmailService: AuthEmailService,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const { payload } = command;

    const defaultRole = await this.roleRepository.findByName(RoleEnum.CUSTOMER);
    if (!defaultRole) {
      throw new Error('Default user role not found');
    }

    if (payload.email) {
      const existingUser = await this.userRepository.findByEmail(payload.email);
      if (existingUser) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'emailAlreadyExists',
          },
        });
      }
    }

    let password: string | null = null;
    if (payload.password) {
      password = await this.passwordHasher.hash(payload.password);
    }

    const user = await this.userRepository.create({
      firstName: payload.firstName ?? null,
      lastName: payload.lastName ?? null,
      email: payload.email,
      password: password,
      role: defaultRole,
      provider: AuthProvidersEnum.EMAIL,
      socialId: null,
    });

    await this.eventBus.publish(new UserRegisteredEvent(user));
    if (user.email) {
      try {
        await this.authEmailService.sendVerification(user.id, user.email);
      } catch {
        // The account has been created. Keep the response successful so the
        // user can use the resend-verification flow once delivery recovers.
      }
    }
  }
}
