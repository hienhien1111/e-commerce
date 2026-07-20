import { UnprocessableEntityException } from '@nestjs/common';
import { EmailPasswordLoginStrategy } from './email-password-auth.strategy';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { User } from '@/domain/entities/user';

describe('EmailPasswordLoginStrategy', () => {
  const userRepository = { findByEmail: jest.fn() };
  const passwordHasher = { compare: jest.fn() };
  const strategy = new EmailPasswordLoginStrategy(
    userRepository as never,
    passwordHasher as never,
  );

  beforeEach(() => {
    userRepository.findByEmail.mockReset();
    passwordHasher.compare.mockReset();
  });

  it('rejects an unverified email/password user before comparing passwords', async () => {
    userRepository.findByEmail.mockResolvedValue({
      id: 'user-123',
      provider: AuthProvidersEnum.EMAIL,
      password: 'hashed-password',
      verifiedAt: null,
    } as User);

    await expect(
      strategy.execute({ email: 'user@example.com', password: 'Password@123' }),
    ).rejects.toMatchObject<Partial<UnprocessableEntityException>>({
      response: { errors: { email: 'emailNotVerified' } },
    });
    expect(passwordHasher.compare).not.toHaveBeenCalled();
  });

  it('allows a verified email/password user with the correct password', async () => {
    const user = {
      id: 'user-123',
      provider: AuthProvidersEnum.EMAIL,
      password: 'hashed-password',
      verifiedAt: new Date(),
    } as User;
    userRepository.findByEmail.mockResolvedValue(user);
    passwordHasher.compare.mockResolvedValue(true);

    await expect(
      strategy.execute({ email: 'user@example.com', password: 'Password@123' }),
    ).resolves.toMatchObject({ user, isNewUser: false });
  });
});
