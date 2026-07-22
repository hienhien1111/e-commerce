import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GenerateAuthenticationOptionsHandler } from '@/application/identity/commands/webauthn/generate-authentication-options/generate-authentication-options.handler';
import { GenerateRegistrationOptionsHandler } from '@/application/identity/commands/webauthn/generate-registration-options/generate-registration-options.handler';
import { RevokeCredentialHandler } from '@/application/identity/commands/webauthn/revoke-credential/revoke-credential.handler';
import { VerifyRegistrationHandler } from '@/application/identity/commands/webauthn/verify-registration/verify-registration.handler';
import { WebAuthnLoginStrategy } from '@/application/identity/strategies/passkey-auth.strategy';

const config = {
  getOrThrow: jest.fn((key: string) => {
    if (key === 'webauthn.rpId') return 'localhost';
    if (key === 'webauthn.rpName') return 'ShopApp';
    if (key === 'webauthn.allowedOrigins') return ['http://localhost:3000'];
    if (key === 'webauthn.challengeTtlSec') return 300;
    throw new Error(`Unexpected config ${key}`);
  }),
};

describe('WebAuthn application operations', () => {
  it('creates usernameless and user-bound authentication challenges', async () => {
    const challenges = { store: jest.fn() };
    const credentials = {
      findActiveByUserId: jest
        .fn()
        .mockResolvedValue([{ credentialId: 'credential-id' }]),
    };
    const users = { findById: jest.fn().mockResolvedValue({ id: 'user-1' }) };
    const handler = new GenerateAuthenticationOptionsHandler(
      challenges as never,
      credentials as never,
      users as never,
      config as never,
    );

    await expect(handler.execute({})).resolves.toMatchObject({
      options: expect.objectContaining({ challenge: expect.any(String) }),
      challengeKey: expect.any(String),
    });
    await expect(handler.execute({ userId: 'user-1' })).resolves.toMatchObject({
      options: expect.objectContaining({ allowCredentials: expect.any(Array) }),
    });
    expect(challenges.store).toHaveBeenCalledTimes(2);
  });

  it('rejects an authentication challenge for an unknown user or no credentials', async () => {
    const challenges = { store: jest.fn() };
    const credentials = { findActiveByUserId: jest.fn().mockResolvedValue([]) };
    const users = { findById: jest.fn().mockResolvedValue(null) };
    const handler = new GenerateAuthenticationOptionsHandler(
      challenges as never,
      credentials as never,
      users as never,
      config as never,
    );

    await expect(handler.execute({ userId: 'missing' })).rejects.toThrow(
      BadRequestException,
    );
    users.findById.mockResolvedValueOnce({ id: 'user-1' });
    await expect(handler.execute({ userId: 'user-1' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('creates registration options and stores the registration challenge', async () => {
    const challenges = { store: jest.fn() };
    const credentials = { findActiveByUserId: jest.fn().mockResolvedValue([]) };
    const result = await new GenerateRegistrationOptionsHandler(
      challenges as never,
      credentials as never,
      config as never,
    ).execute({
      userId: 'user-1',
      userDisplayName: 'Tester',
      userEmail: 'user@shop.local',
    });

    expect(result.options.challenge).toEqual(expect.any(String));
    expect(challenges.store).toHaveBeenCalledWith(
      result.challengeKey,
      expect.objectContaining({ userId: 'user-1', purpose: 'registration' }),
    );
  });

  it('allows a credential owner to revoke only their own credential', async () => {
    const repository = {
      findByCredentialId: jest
        .fn()
        .mockResolvedValue({ id: 'db-id', userId: 'user-1' }),
      remove: jest.fn(),
    };
    const handler = new RevokeCredentialHandler(repository as never);

    await expect(
      handler.execute({ credentialId: 'credential-id', userId: 'user-1' }),
    ).resolves.toMatchObject({ success: true });
    repository.findByCredentialId.mockResolvedValueOnce({
      id: 'db-id',
      userId: 'other',
    });
    await expect(
      handler.execute({ credentialId: 'credential-id', userId: 'user-1' }),
    ).rejects.toThrow(ForbiddenException);
    repository.findByCredentialId.mockResolvedValueOnce(null);
    await expect(
      handler.execute({ credentialId: 'missing', userId: 'user-1' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('rejects registration verification before invoking the external verifier for invalid challenges', async () => {
    const challenges = {
      retrieve: jest.fn().mockResolvedValue(null),
      remove: jest.fn(),
    };
    const credentials = { findByCredentialId: jest.fn() };
    const handler = new VerifyRegistrationHandler(
      challenges as never,
      credentials as never,
      config as never,
    );

    await expect(
      handler.execute({
        userId: 'user-1',
        challengeKey: 'bad',
        response: {} as never,
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an authentication login before external verification for a missing challenge or credential', async () => {
    const challenges = {
      retrieve: jest.fn().mockResolvedValue(null),
      remove: jest.fn(),
    };
    const credentials = { findByCredentialId: jest.fn() };
    const users = { findById: jest.fn() };
    const strategy = new WebAuthnLoginStrategy(
      config as never,
      challenges as never,
      credentials as never,
      users as never,
    );

    await expect(
      strategy.execute({
        challengeKey: 'bad',
        response: { id: 'credential-id' } as never,
      }),
    ).rejects.toThrow(UnauthorizedException);
    challenges.retrieve.mockResolvedValueOnce({
      purpose: 'authentication',
      challenge: 'challenge',
      userId: undefined,
      expiresAt: new Date(),
    });
    credentials.findByCredentialId.mockResolvedValueOnce(null);
    await expect(
      strategy.execute({
        challengeKey: 'ok',
        response: { id: 'credential-id' } as never,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
