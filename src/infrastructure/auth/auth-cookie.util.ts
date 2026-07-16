import type { CookieOptions, Response } from 'express';
import ms from 'ms';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from './auth-cookie.constants';

type AuthTokenPair = {
  token: string;
  refreshToken: string;
  tokenExpires: number;
};

function cookieOptions(
  configService: ConfigService<AllConfigType>,
  path: string,
): CookieOptions {
  const nodeEnv = configService.getOrThrow('app.nodeEnv', { infer: true });

  return {
    httpOnly: true,
    secure: nodeEnv === 'production',
    sameSite: 'lax',
    path,
  };
}

function getCookiePaths(configService: ConfigService<AllConfigType>) {
  const apiPrefix = configService.getOrThrow('app.apiPrefix', {
    infer: true,
  });
  const apiPath = `/${apiPrefix}`;

  return {
    access: apiPath,
    refresh: `${apiPath}/v1/refresh`,
  };
}

export function setAuthCookies(
  response: Response,
  tokens: AuthTokenPair,
  configService: ConfigService<AllConfigType>,
): void {
  const paths = getCookiePaths(configService);
  const accessMaxAge = Math.max(tokens.tokenExpires - Date.now(), 0);
  const refreshExpires = configService.getOrThrow('auth.refreshExpires', {
    infer: true,
  });
  const refreshMaxAge = ms(refreshExpires);

  response.cookie(ACCESS_TOKEN_COOKIE, tokens.token, {
    ...cookieOptions(configService, paths.access),
    maxAge: accessMaxAge,
  });
  response.cookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, {
    ...cookieOptions(configService, paths.refresh),
    maxAge: refreshMaxAge,
  });
}

export function clearAuthCookies(
  response: Response,
  configService: ConfigService<AllConfigType>,
): void {
  const paths = getCookiePaths(configService);
  response.clearCookie(
    ACCESS_TOKEN_COOKIE,
    cookieOptions(configService, paths.access),
  );
  response.clearCookie(
    REFRESH_TOKEN_COOKIE,
    cookieOptions(configService, paths.refresh),
  );
}
