import { ResendConfirmationHandler } from './resend-confirmation.handler';
import { ResendConfirmationCommand } from './resend-confirmation.command';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { User } from '@/domain/entities/user';

describe('ResendConfirmationHandler', () => {
  const userRepository = { findByEmail: jest.fn() };
  const authEmailService = { sendVerification: jest.fn() };
  const handler = new ResendConfirmationHandler(
    userRepository as never,
    authEmailService as never,
  );

  beforeEach(() => {
    userRepository.findByEmail.mockReset();
    authEmailService.sendVerification.mockReset();
  });

  it('resends only for an unverified email/password account', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'user@example.com',
      provider: AuthProvidersEnum.EMAIL,
      verifiedAt: null,
    } as User);

    await handler.execute(new ResendConfirmationCommand('user@example.com'));

    expect(authEmailService.sendVerification).toHaveBeenCalledWith(
      'user-123',
      'user@example.com',
    );
  });

  it('does not send for unknown or already verified accounts', async () => {
    userRepository.findByEmail.mockResolvedValue(null);
    await handler.execute(new ResendConfirmationCommand('unknown@example.com'));

    userRepository.findByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'user@example.com',
      provider: AuthProvidersEnum.EMAIL,
      verifiedAt: new Date(),
    } as User);
    await handler.execute(new ResendConfirmationCommand('user@example.com'));

    expect(authEmailService.sendVerification).not.toHaveBeenCalled();
  });

  it('keeps the response generic when delivery fails', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'user@example.com',
      provider: AuthProvidersEnum.EMAIL,
      verifiedAt: null,
    } as User);
    authEmailService.sendVerification.mockRejectedValue(new Error('offline'));

    await expect(
      handler.execute(new ResendConfirmationCommand('user@example.com')),
    ).resolves.toBeUndefined();
  });
});
