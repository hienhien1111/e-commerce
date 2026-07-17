import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnprocessableEntityException } from '@nestjs/common';
import { AuthEmailTokenService } from './auth-email-token.service';

describe('AuthEmailTokenService', () => {
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      const values: Record<string, string> = {
        'auth.confirmEmailSecret': 'confirm-secret',
        'auth.confirmEmailExpires': '1h',
        'auth.forgotSecret': 'forgot-secret',
        'auth.forgotExpires': '1h',
      };
      return values[key];
    }),
  } as unknown as ConfigService;

  const service = new AuthEmailTokenService(new JwtService(), configService);

  it('creates and verifies a verification token for its intended purpose', async () => {
    const token = await service.createVerificationToken('user-123');

    await expect(service.verify(token, 'verify-email')).resolves.toMatchObject({
      sub: 'user-123',
      action: 'verify-email',
    });
  });

  it('rejects a valid token used for a different purpose', async () => {
    const token = await service.createVerificationToken('user-123');

    await expect(
      service.verify(token, 'reset-password'),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('preserves the requested email in an email-change token', async () => {
    const token = await service.createNewEmailToken(
      'user-123',
      'new@example.com',
    );

    await expect(
      service.verify(token, 'verify-new-email'),
    ).resolves.toMatchObject({
      newEmail: 'new@example.com',
    });
  });
});
