import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import {
  HttpStatus,
  Inject,
  UnprocessableEntityException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { GoogleLoginCommand } from './google-login.command';
import { GoogleLoginResult } from './google-login.result';
import type { SessionRepositoryPort } from '../../ports/session/session.repository.port';
import type { TokenPort } from '../../ports/token/token.port';
import { TOKEN_PORT } from '../../ports/token/token.port.token';
import { SESSION_REPOSITORY_PORT } from '../../ports/session/session.repository.port.token';
import type { UserRepositoryPort } from '../../ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import type { RoleRepositoryPort } from '@/application/authorization/ports/role.repository.port';
import { ROLE_REPOSITORY_PORT } from '@/application/authorization/ports/tokens';
import { RoleEnum } from '@/domain/enums/role.enum';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { UserLoggedInEvent } from '@/domain/events/user-logged-in.event';

@CommandHandler(GoogleLoginCommand)
export class GoogleLoginHandler implements ICommandHandler<GoogleLoginCommand> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: SessionRepositoryPort,
    @Inject(TOKEN_PORT)
    private readonly tokenPort: TokenPort,
    @Inject(ROLE_REPOSITORY_PORT)
    private readonly roleRepository: RoleRepositoryPort,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: GoogleLoginCommand): Promise<GoogleLoginResult> {
    const { profile } = command;

    let user = await this.userRepository.findBySocialIdAndProvider({
      socialId: profile.socialId,
      provider: AuthProvidersEnum.GOOGLE,
    });

    if (!user) {
      const email = profile.email.trim().toLowerCase();
      if (!email) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: 'googleEmailRequired',
          },
        });
      }

      const userWithSameEmail = await this.userRepository.findByEmail(email);
      if (userWithSameEmail) {
        throw new UnprocessableEntityException({
          status: HttpStatus.UNPROCESSABLE_ENTITY,
          errors: {
            email: `needLoginViaProvider:${userWithSameEmail.provider}`,
          },
        });
      }

      const defaultRole = await this.roleRepository.findByName(
        RoleEnum.CUSTOMER,
      );
      if (!defaultRole) {
        throw new Error('Default user role not found');
      }

      user = await this.userRepository.create({
        email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        password: null,
        provider: AuthProvidersEnum.GOOGLE,
        socialId: profile.socialId,
        role: defaultRole,
        verifiedAt: new Date(),
      });
    }

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionRepository.create({
      user: user!,
      hash,
    });

    const accessTokenData = await this.tokenPort.signAccessToken({
      id: user!.id,
      role: user!.role,
      sessionId: session.id,
    });

    const refreshTokenData = await this.tokenPort.signRefreshToken({
      sessionId: session.id,
      hash,
    });

    const result: GoogleLoginResult = {
      refreshToken: refreshTokenData.refreshToken,
      token: accessTokenData.token,
      tokenExpires: accessTokenData.tokenExpires,
      user: user!,
    };

    await this.eventBus.publish(new UserLoggedInEvent(user!, session.id));

    return result;
  }
}
