import { UserFactory } from '@/domain/factories/user.factory';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';

describe('User', () => {
  it('updates profile phone and avatar without exposing the storage public ID', () => {
    const user = UserFactory.create({
      email: 'user@example.com',
      password: 'hashed-password',
      provider: AuthProvidersEnum.EMAIL,
      socialId: null,
      firstName: 'Jane',
      lastName: 'Doe',
      role: null,
    });

    user.updateProfile(undefined, undefined, '0901234567');
    user.updateAvatar(
      'https://res.cloudinary.com/demo/image/upload/avatar.png',
      'avatars/user/avatar',
    );

    expect(user.phone).toBe('0901234567');
    expect(user.avatarUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/avatar.png',
    );
    expect(user.avatarPublicId).toBe('avatars/user/avatar');
    expect(user.toJSON()).toMatchObject({
      phone: '0901234567',
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/avatar.png',
    });
    expect(user.toJSON()).not.toHaveProperty('avatarPublicId');
  });

  it('allows a phone number to be cleared', () => {
    const user = UserFactory.create({
      email: 'user@example.com',
      password: 'hashed-password',
      provider: AuthProvidersEnum.EMAIL,
      socialId: null,
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '0901234567',
      role: null,
    });

    user.updateProfile(undefined, undefined, null);

    expect(user.phone).toBeNull();
  });

  it('tracks email verification without exposing storage internals', () => {
    const user = UserFactory.create({
      email: 'user@example.com',
      password: 'hashed-password',
      provider: AuthProvidersEnum.EMAIL,
      socialId: null,
      firstName: 'Jane',
      lastName: 'Doe',
      role: null,
    });

    expect(user.verifiedAt).toBeNull();
    user.confirmEmail();

    expect(user.verifiedAt).toBeInstanceOf(Date);
    expect(user.toJSON()).toMatchObject({ verifiedAt: user.verifiedAt });
  });
});
