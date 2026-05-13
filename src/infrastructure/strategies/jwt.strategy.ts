import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { OrNeverType } from '@/utils/types/or-never.type';
import { JwtPayloadType } from '@/application/identity/types/jwt-payload.type';
import { AllConfigType } from '@/config/config.type';
import type { UserRepositoryPort } from '@/application/identity/ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '@/application/identity/ports/user/user.repository.port.token';
import { User } from '@/domain/entities/user';

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
  ) {
    const accessPublicKey = configService
      .getOrThrow('auth.accessPublicKey', { infer: true })
      .replaceAll('\\n', '\n');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
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

    // Attach sessionId from the JWT payload so handlers that need to
    // mutate the session (logout, session revoke) can access it via
    // request.user.sessionId without a second DB lookup.
    (user as AuthenticatedUser).sessionId = payload.sessionId;
    return user as AuthenticatedUser;
  }
}
