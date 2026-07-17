import { Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OrNeverType } from '@/utils/types/or-never.type';
import { JwtPayloadType } from '@/application/identity/types/jwt-payload.type';
import { AllConfigType } from '@/config/config.type';
import type { UserRepositoryPort } from '@/application/identity/ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '@/application/identity/ports/user/user.repository.port.token';
import type { SessionRepositoryPort } from '@/application/identity/ports/session/session.repository.port';
import { SESSION_REPOSITORY_PORT } from '@/application/identity/ports/session/session.repository.port.token';
import { User } from '@/domain/entities/user';
import { ACCESS_TOKEN_COOKIE } from '@/infrastructure/auth/auth-cookie.constants';
import { extractCookieToken } from './cookie-token.extractor';

/**
 * Authenticated request user shape — the domain User plus the session id
 * derived from the JWT payload. Controllers read `request.user.sessionId`
 * for endpoints that need to mutate the session (e.g. logout).
 */
export type AuthenticatedUser = User & { sessionId: string };

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService<AllConfigType>,
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: SessionRepositoryPort,
  ) {
    const accessPublicKey = configService
      .getOrThrow('auth.accessPublicKey', { infer: true })
      .replaceAll('\\n', '\n');
    super({
      jwtFromRequest: (request) =>
        extractCookieToken(request, ACCESS_TOKEN_COOKIE),
      secretOrKey: accessPublicKey,
      algorithms: ['RS256'] as const,
    });
  }

  public async validate(
    payload: JwtPayloadType,
  ): Promise<OrNeverType<AuthenticatedUser>> {
    if (!payload.id || !payload.sessionId) {
      throw new UnauthorizedException();
    }

    const user = await this.userRepository.findById(payload.id);

    if (!user) {
      throw new UnauthorizedException();
    }

    const session = await this.sessionRepository.findById(payload.sessionId);
    if (!session || session.user.id !== user.id) {
      throw new UnauthorizedException();
    }

    // Compose without mutating the loaded entity: preserve User's prototype
    // (getters/methods) and graft sessionId on a fresh instance.
    const authenticated: AuthenticatedUser = Object.assign(
      Object.create(Object.getPrototypeOf(user)) as User,
      user,
      { sessionId: payload.sessionId },
    );
    return authenticated;
  }
}
