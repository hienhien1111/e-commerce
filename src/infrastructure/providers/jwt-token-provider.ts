import ms from 'ms';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import {
  TokenPort,
  AccessTokenData,
  RefreshTokenData,
} from '@/application/identity/ports/token/token.port';

@Injectable()
export class JwtTokenProvider implements TokenPort {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AllConfigType>,
  ) {}

  async signAccessToken(payload: {
    id: string;
    role: { id: string } | null | undefined;
    sessionId: string;
  }): Promise<AccessTokenData> {
    const expires = this.config.getOrThrow('auth.expires', { infer: true });
    const accessPrivateKey = this.config
      .getOrThrow('auth.accessPrivateKey', { infer: true })
      .replace(/\\n/g, '\n');
    const rolePayload = payload.role ? { id: payload.role.id } : null;
    const token = await this.jwt.signAsync(
      { id: payload.id, role: rolePayload, sessionId: payload.sessionId },
      { privateKey: accessPrivateKey, algorithm: 'RS256', expiresIn: expires },
    );
    const tokenExpires = Date.now() + ms(expires);
    return { token, tokenExpires };
  }

  async signRefreshToken(payload: {
    sessionId: string;
    hash: string;
  }): Promise<RefreshTokenData> {
    const refreshPrivateKey = this.config
      .getOrThrow('auth.refreshPrivateKey', { infer: true })
      .replace(/\\n/g, '\n');
    const expiresIn = this.config.getOrThrow('auth.refreshExpires', {
      infer: true,
    });
    const refreshToken = await this.jwt.signAsync(
      { sessionId: payload.sessionId, hash: payload.hash },
      { privateKey: refreshPrivateKey, algorithm: 'RS256', expiresIn },
    );
    return { refreshToken };
  }
}
