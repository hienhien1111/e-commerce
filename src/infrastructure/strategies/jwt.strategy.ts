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

  public async validate(payload: JwtPayloadType): Promise<OrNeverType<User>> {
    if (!payload.id) {
      throw new UnauthorizedException();
    }

    const user = await this.userRepository.findById(payload.id);

    if (!user) {
      throw new UnauthorizedException();
    }

    return user;
  }
}
