import { UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { AuthController } from './auth.controller';

describe('AuthController Google OAuth callback', () => {
  const queryBus = {} as QueryBus;
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'app.frontendDomain': 'http://localhost:3000',
        'app.nodeEnv': 'development',
        'app.apiPrefix': 'api',
        'auth.refreshExpires': '30d',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  const createResponse = () => ({
    cookie: jest.fn(),
    redirect: jest.fn(),
  });

  it('sets HttpOnly cookies and redirects to the profile page', async () => {
    const commandBus = {
      execute: jest.fn().mockResolvedValue({
        token: 'access+token',
        refreshToken: 'refresh/token',
        tokenExpires: 1_700_000_000_000,
      }),
    } as unknown as CommandBus;
    const controller = new AuthController(commandBus, queryBus, configService);
    const response = createResponse();

    await controller.googleAuthRedirect(
      {
        user: {
          socialId: 'google-id',
          email: 'user@example.com',
          firstName: 'User',
          lastName: 'Example',
        },
      } as never,
      response as never,
    );

    expect(response.cookie).toHaveBeenCalledTimes(2);
    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/profile',
    );
  });

  it('redirects an existing email account to email login', async () => {
    const commandBus = {
      execute: jest.fn().mockRejectedValue(
        new UnprocessableEntityException({
          errors: { email: 'needLoginViaProvider:email' },
        }),
      ),
    } as unknown as CommandBus;
    const controller = new AuthController(commandBus, queryBus, configService);
    const response = createResponse();

    await controller.googleAuthRedirect(
      {
        user: {
          socialId: 'google-id',
          email: 'user@example.com',
          firstName: 'User',
          lastName: 'Example',
        },
      } as never,
      response as never,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/login?error=use_email_login',
    );
  });
});
