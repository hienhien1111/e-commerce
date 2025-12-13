import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { UserLoggedInEvent } from '@/domain/events/user-logged-in.event';
import { Inject } from '@nestjs/common';
import crypto from 'node:crypto';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { AuthLoginCommand } from './login.command';
import { LoginResult } from './login.result';
import type { SessionRepositoryPort } from '../../ports/session/session.repository.port';
import type { TokenPort } from '../../ports/token/token.port';
import { TOKEN_PORT } from '../../ports/token/token.port.token';
import { SESSION_REPOSITORY_PORT } from '../../ports/session/session.repository.port.token';
import { LoginStrategyResolver } from '@/application/identity/factories/auth-strategy.factory';

@CommandHandler(AuthLoginCommand)
export class LoginHandler implements ICommandHandler<AuthLoginCommand> {
  constructor(
    @Inject(SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: SessionRepositoryPort,
    @Inject(TOKEN_PORT)
    private readonly tokenPort: TokenPort,
    private readonly eventBus: EventBus,
    private readonly strategyResolver: LoginStrategyResolver,
  ) {}

  async execute(command: AuthLoginCommand): Promise<LoginResult> {
    const { payload } = command;

    const strategy = this.strategyResolver.resolve(payload);
    const { user } = await strategy.execute(payload);

    const hash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const session = await this.sessionRepository.create({
      user,
      hash,
    });

    const accessTokenData = await this.tokenPort.signAccessToken({
      id: user.id,
      role: user.role,
      sessionId: session.id,
    });

    const refreshTokenData = await this.tokenPort.signRefreshToken({
      sessionId: session.id,
      hash,
    });

    const result: LoginResult = {
      refreshToken: refreshTokenData.refreshToken,
      token: accessTokenData.token,
      tokenExpires: accessTokenData.tokenExpires,
      user,
    };

    await this.eventBus.publish(new UserLoggedInEvent(user, session.id));

    return result;
  }
}
