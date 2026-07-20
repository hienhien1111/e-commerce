import { ResetPasswordHandler } from './reset-password.handler';
import { ResetPasswordCommand } from './reset-password.command';
import { User } from '@/domain/entities/user';

describe('ResetPasswordHandler', () => {
  const userRepository = { findById: jest.fn(), update: jest.fn() };
  const passwordHasher = { hash: jest.fn() };
  const sessionRepository = { deleteByUserId: jest.fn() };
  const tokenService = { verify: jest.fn() };
  const handler = new ResetPasswordHandler(
    userRepository as never,
    passwordHasher as never,
    sessionRepository as never,
    tokenService as never,
  );

  beforeEach(() => {
    userRepository.findById.mockReset();
    userRepository.update.mockReset();
    passwordHasher.hash.mockReset();
    sessionRepository.deleteByUserId.mockReset();
    tokenService.verify.mockReset();
  });

  it('hashes the new password and revokes every session', async () => {
    tokenService.verify.mockResolvedValue({ sub: 'user-123' });
    userRepository.findById.mockResolvedValue({ id: 'user-123' } as User);
    passwordHasher.hash.mockResolvedValue('new-hash');
    userRepository.update.mockResolvedValue({ id: 'user-123' } as User);

    await handler.execute(new ResetPasswordCommand('token', 'NewPassword@123'));

    expect(tokenService.verify).toHaveBeenCalledWith('token', 'reset-password');
    expect(sessionRepository.deleteByUserId).toHaveBeenCalledWith({
      userId: 'user-123',
    });
    expect(userRepository.update).toHaveBeenCalledWith('user-123', {
      password: 'new-hash',
    });
  });
});
