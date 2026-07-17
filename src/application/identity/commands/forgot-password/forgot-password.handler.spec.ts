import { ForgotPasswordHandler } from './forgot-password.handler';
import { ForgotPasswordCommand } from './forgot-password.command';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { User } from '@/domain/entities/user';

describe('ForgotPasswordHandler', () => {
  const userRepository = { findByEmail: jest.fn() };
  const authEmailService = { sendPasswordReset: jest.fn() };
  const handler = new ForgotPasswordHandler(
    userRepository as never,
    authEmailService as never,
  );

  beforeEach(() => {
    userRepository.findByEmail.mockReset();
    authEmailService.sendPasswordReset.mockReset();
  });

  it('does not expose whether a requested email account exists', async () => {
    userRepository.findByEmail.mockResolvedValue(null);

    await expect(
      handler.execute(new ForgotPasswordCommand('unknown@example.com')),
    ).resolves.toBeUndefined();
    expect(authEmailService.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('sends a reset message for an eligible local account', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'user@example.com',
      provider: AuthProvidersEnum.EMAIL,
    } as User);

    await handler.execute(new ForgotPasswordCommand('user@example.com'));

    expect(authEmailService.sendPasswordReset).toHaveBeenCalledWith(
      'user-123',
      'user@example.com',
    );
  });

  it('still returns successfully when delivery fails', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user-123',
      email: 'user@example.com',
      provider: AuthProvidersEnum.EMAIL,
    } as User);
    authEmailService.sendPasswordReset.mockRejectedValue(new Error('offline'));

    await expect(
      handler.execute(new ForgotPasswordCommand('user@example.com')),
    ).resolves.toBeUndefined();
  });
});
