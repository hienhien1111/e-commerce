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

  it('sets HttpOnly cookies and redirects a customer to the storefront', async () => {
    const commandBus = {
      execute: jest.fn().mockResolvedValue({
        token: 'access+token',
        refreshToken: 'refresh/token',
        tokenExpires: 1_700_000_000_000,
        user: { role: { name: 'customer' } },
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
    expect(response.redirect).toHaveBeenCalledWith('http://localhost:3000/');
  });

  it('redirects an administrator to the admin workspace', async () => {
    const commandBus = {
      execute: jest.fn().mockResolvedValue({
        token: 'access+token',
        refreshToken: 'refresh/token',
        tokenExpires: 1_700_000_000_000,
        user: { role: { name: 'admin' } },
      }),
    } as unknown as CommandBus;
    const controller = new AuthController(commandBus, queryBus, configService);
    const response = createResponse();

    await controller.googleAuthRedirect(
      {
        user: {
          socialId: 'google-admin-id',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'Shop',
        },
      } as never,
      response as never,
    );

    expect(response.redirect).toHaveBeenCalledWith(
      'http://localhost:3000/admin',
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
