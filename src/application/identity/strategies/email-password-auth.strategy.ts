import {
  Injectable,
  UnprocessableEntityException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import {
  LoginStrategy,
  EmailPasswordLoginInput,
  LoginResult,
} from '@/domain/strategies/auth/i-auth-strategy';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import type { UserRepositoryPort } from '@/application/identity/ports/user/user.repository.port';
import type { PasswordHasherPort } from '@/application/identity/ports/password-hasher/password-hasher.port';
import { USER_REPOSITORY_PORT } from '@/application/identity/ports/user/user.repository.port.token';
import { PASSWORD_HASHER_PORT } from '@/application/identity/ports/password-hasher/password-hasher.port.token';

@Injectable()
export class EmailPasswordLoginStrategy
  implements LoginStrategy<EmailPasswordLoginInput>
{
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(input: EmailPasswordLoginInput): Promise<LoginResult> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: 'notFound',
        },
      });
    }

    if (user.provider !== AuthProvidersEnum.EMAIL) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          email: `needLoginViaProvider:${user.provider}`,
        },
      });
    }

    if (!user.password) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          password: 'incorrectPassword',
        },
      });
    }

    if (!user.verifiedAt) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: { email: 'emailNotVerified' },
      });
    }

    const isValidPassword = await this.passwordHasher.compare(
      input.password!,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnprocessableEntityException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        errors: {
          password: 'incorrectPassword',
        },
      });
    }

    return {
      user,
      isNewUser: false,
    };
  }
}
