import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfirmEmailHandler } from '@/application/identity/commands/confirm-email/confirm-email.handler';
import { ConfirmNewEmailHandler } from '@/application/identity/commands/confirm-email/confirm-new-email.handler';
import { RequestEmailChangeHandler } from '@/application/identity/commands/request-email-change/request-email-change.handler';
import { LoginStrategyResolver } from '@/application/identity/factories/auth-strategy.factory';
import { GetUserCredentialsHandler } from '@/application/identity/queries/webauthn/get-user-credentials/get-user-credentials.handler';
import { AuthEmailService } from '@/application/identity/services/auth-email.service';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';

const localUser = {
  id: 'user-1',
  email: 'user@shop.local',
  provider: AuthProvidersEnum.EMAIL,
  password: 'hashed-password',
};

describe('Identity application operations', () => {
  it('confirms an existing email and publishes the confirmation event', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(localUser),
      update: jest
        .fn()
        .mockResolvedValue({ ...localUser, verifiedAt: new Date() }),
    };
    const events = { publish: jest.fn() };
    const tokens = {
      verify: jest.fn().mockResolvedValue({ sub: localUser.id }),
    };
    const handler = new ConfirmEmailHandler(
      users as never,
      events as never,
      tokens as never,
    );

    await expect(handler.execute({ hash: 'token' })).resolves.toBeUndefined();
    expect(users.update).toHaveBeenCalledWith(
      localUser.id,
      expect.objectContaining({ verifiedAt: expect.any(Date) }),
    );
    expect(events.publish).toHaveBeenCalledTimes(1);
    users.findById.mockResolvedValueOnce(null);
    await expect(handler.execute({ hash: 'missing' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('confirms a new email only when the token and address are valid', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(localUser),
      findByEmail: jest.fn().mockResolvedValue(null),
      update: jest.fn(),
    };
    const sessions = { deleteByUserId: jest.fn() };
    const tokens = {
      verify: jest.fn().mockResolvedValue({
        sub: localUser.id,
        newEmail: 'new@shop.local',
      }),
    };
    const handler = new ConfirmNewEmailHandler(
      users as never,
      sessions as never,
      tokens as never,
    );

    await handler.execute({ hash: 'token' });
    expect(users.update).toHaveBeenCalledWith(
      localUser.id,
      expect.objectContaining({ email: 'new@shop.local' }),
    );
    expect(sessions.deleteByUserId).toHaveBeenCalledWith({
      userId: localUser.id,
    });
    tokens.verify.mockResolvedValueOnce({ sub: localUser.id });
    await expect(handler.execute({ hash: 'bad' })).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('requires a correct local password before requesting an email change', async () => {
    const users = {
      findById: jest.fn().mockResolvedValue(localUser),
      findByEmail: jest.fn().mockResolvedValue(null),
    };
    const passwords = { compare: jest.fn().mockResolvedValue(true) };
    const email = { sendNewEmailConfirmation: jest.fn() };
    const handler = new RequestEmailChangeHandler(
      users as never,
      passwords as never,
      email as never,
    );

    await handler.execute({
      userId: localUser.id,
      currentPassword: 'password',
      email: 'new@shop.local',
    });
    expect(email.sendNewEmailConfirmation).toHaveBeenCalledWith(
      localUser.id,
      'new@shop.local',
    );
    passwords.compare.mockResolvedValueOnce(false);
    await expect(
      handler.execute({
        userId: localUser.id,
        currentPassword: 'wrong',
        email: 'new@shop.local',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('maps credential entities to the safe user credential result', async () => {
    const createdAt = new Date();
    const repository = {
      findByUserId: jest.fn().mockResolvedValue([
        {
          id: 'credential-1',
          credentialId: 'credential-id',
          deviceType: 'singleDevice',
          backedUp: false,
          transports: ['internal'],
          createdAt,
          lastUsedAt: null,
          userId: 'user-1',
          publicKey: Buffer.from('key'),
        },
      ]),
    };

    await expect(
      new GetUserCredentialsHandler(repository as never).execute({
        userId: 'user-1',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        id: 'credential-1',
        credentialId: 'credential-id',
      }),
    ]);
  });

  it('sends verification, reset, and new-email links using generated tokens', async () => {
    const emailPort = { send: jest.fn() };
    const tokens = {
      createVerificationToken: jest.fn().mockResolvedValue('verify-token'),
      createPasswordResetToken: jest.fn().mockResolvedValue('reset-token'),
      createNewEmailToken: jest.fn().mockResolvedValue('new-email-token'),
    };
    const config = {
      getOrThrow: jest.fn().mockReturnValue('http://localhost:3000'),
    };
    const service = new AuthEmailService(
      emailPort as never,
      tokens as never,
      config as never,
    );

    await service.sendVerification('user-1', 'user@shop.local');
    await service.sendPasswordReset('user-1', 'user@shop.local');
    await service.sendNewEmailConfirmation('user-1', 'new@shop.local');
    expect(emailPort.send).toHaveBeenCalledTimes(3);
    expect(emailPort.send.mock.calls[2][0]).toMatchObject({
      to: 'new@shop.local',
      text: expect.stringContaining('mode=new-email'),
    });
  });

  it('routes email and WebAuthn login payloads to their strategy', async () => {
    const emailStrategy = {
      execute: jest.fn().mockResolvedValue({ type: 'email' }),
    };
    const webauthnStrategy = {
      execute: jest.fn().mockResolvedValue({ type: 'webauthn' }),
    };
    const resolver = new LoginStrategyResolver(
      emailStrategy as never,
      webauthnStrategy as never,
    );

    await expect(
      resolver.execute({
        email: 'user@shop.local',
        password: 'password',
      } as never),
    ).resolves.toEqual({ type: 'email' });
    await expect(
      resolver.execute({ challengeKey: 'challenge', response: {} } as never),
    ).resolves.toEqual({ type: 'webauthn' });
    expect(() => resolver.execute({} as never)).toThrow('Unknown login type');
  });
});
