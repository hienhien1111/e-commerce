import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleOAuthConfiguredGuard } from './google-oauth-configured.guard';

describe('GoogleOAuthConfiguredGuard', () => {
  const createGuard = (config: Record<string, string | undefined>) => {
    const configService = {
      get: jest.fn((key: string) => config[key]),
    } as unknown as ConfigService;

    return new GoogleOAuthConfiguredGuard(configService);
  };

  it('allows Google OAuth when all required settings are present', () => {
    const guard = createGuard({
      'googleOAuth.clientId': 'client-id',
      'googleOAuth.clientSecret': 'client-secret',
      'googleOAuth.callbackUrl': 'https://example.com/api/v1/google/callback',
    });

    expect(guard.canActivate({} as never)).toBe(true);
  });

  it('returns 503 when Google OAuth is not configured', () => {
    const guard = createGuard({
      'googleOAuth.clientId': 'client-id',
      'googleOAuth.clientSecret': undefined,
      'googleOAuth.callbackUrl': 'https://example.com/api/v1/google/callback',
    });

    expect(() => guard.canActivate({} as never)).toThrow(
      ServiceUnavailableException,
    );
  });
});
