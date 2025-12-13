import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnauthorizedException, Inject } from '@nestjs/common';
import ms from 'ms';
import crypto from 'node:crypto';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenCommand } from './refresh-token.command';
import { RefreshTokenResult } from './refresh-token.result';
import { AllConfigType } from '@/config/config.type';
import type { UserRepositoryPort } from '../../ports/user/user.repository.port';
import type { SessionRepositoryPort } from '../../ports/session/session.repository.port';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { SESSION_REPOSITORY_PORT } from '../../ports/session/session.repository.port.token';

@CommandHandler(RefreshTokenCommand)
export class RefreshTokenHandler
  implements ICommandHandler<RefreshTokenCommand>
{
  constructor(
    @Inject(SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: SessionRepositoryPort,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async execute(command: RefreshTokenCommand): Promise<RefreshTokenResult> {
    const { sessionId, hash } = command;
    const session = await this.sessionRepository.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException();
    }

    if (session.hash !== hash) {
      throw new UnauthorizedException();
    }

    const newHash = crypto
      .createHash('sha256')
      .update(randomStringGenerator())
      .digest('hex');

    const user = await this.userRepository.findById(session.user.id);

    if (!user?.role) {
      throw new UnauthorizedException();
    }

    await this.sessionRepository.update(session.id, {
      hash: newHash,
    });

    const tokenExpiresIn = this.configService.getOrThrow('auth.expires', {
      infer: true,
    });

    const tokenExpires = Date.now() + ms(tokenExpiresIn);

    const accessPrivateKey = this.configService
      .getOrThrow('auth.accessPrivateKey', { infer: true })
      .replace(/\\n/g, '\n');
    const refreshPrivateKey = this.configService
      .getOrThrow('auth.refreshPrivateKey', { infer: true })
      .replace(/\\n/g, '\n');

    const [token, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          id: session.user.id,
          role: {
            id: user.role.id,
          },
          sessionId: session.id,
        },
        {
          privateKey: accessPrivateKey,
          algorithm: 'RS256',
          expiresIn: tokenExpiresIn,
        },
      ),
      this.jwtService.signAsync(
        {
          sessionId: session.id,
          hash: newHash,
        },
        {
          privateKey: refreshPrivateKey,
          algorithm: 'RS256',
          expiresIn: this.configService.getOrThrow('auth.refreshExpires', {
            infer: true,
          }),
        },
      ),
    ]);

    return {
      token,
      refreshToken,
      tokenExpires,
    };
  }
}
