import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { GoogleLoginHandler } from './google-login.handler';
import { GoogleLoginCommand } from './google-login.command';
import { SESSION_REPOSITORY_PORT } from '../../ports/session/session.repository.port.token';
import { TOKEN_PORT } from '../../ports/token/token.port.token';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { ROLE_REPOSITORY_PORT } from '@/application/authorization/ports/tokens';
import { UserLoggedInEvent } from '@/domain/events/user-logged-in.event';
import { User } from '@/domain/entities/user';
import { Session } from '@/domain/entities/session';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';

describe('GoogleLoginHandler', () => {
  let handler: GoogleLoginHandler;
  let sessionRepository: jest.Mocked<{ create: jest.Mock }>;
  let userRepository: jest.Mocked<{
    findBySocialIdAndProvider: jest.Mock;
    findByEmail: jest.Mock;
    create: jest.Mock;
  }>;
  let tokenPort: jest.Mocked<{
    signAccessToken: jest.Mock;
    signRefreshToken: jest.Mock;
  }>;
  let roleRepository: jest.Mocked<{ findByName: jest.Mock }>;
  let eventBus: jest.Mocked<EventBus>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    provider: AuthProvidersEnum.EMAIL,
    role: { id: 'role-123', name: 'user' },
  } as User;

  const mockSession = {
    id: 'session-123',
    hash: 'test-hash',
  } as Session;

  beforeEach(async () => {
    sessionRepository = { create: jest.fn() };
    userRepository = {
      findBySocialIdAndProvider: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    tokenPort = {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
    };
    roleRepository = { findByName: jest.fn() };
    eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GoogleLoginHandler,
        { provide: SESSION_REPOSITORY_PORT, useValue: sessionRepository },
        { provide: TOKEN_PORT, useValue: tokenPort },
        { provide: USER_REPOSITORY_PORT, useValue: userRepository },
        { provide: ROLE_REPOSITORY_PORT, useValue: roleRepository },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<GoogleLoginHandler>(GoogleLoginHandler);
  });

  describe('execute', () => {
    const profile = {
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe',
      socialId: 'google-123',
    };

    beforeEach(() => {
      sessionRepository.create.mockResolvedValue(mockSession);
      tokenPort.signAccessToken.mockResolvedValue({
        token: 'access-token',
        tokenExpires: Date.now() + 3600000,
      });
      tokenPort.signRefreshToken.mockResolvedValue({
        refreshToken: 'refresh-token',
      });
      roleRepository.findByName.mockResolvedValue({
        id: 'role-123',
        name: 'user',
      });
    });

    it('should find existing user by social id and login', async () => {
      userRepository.findBySocialIdAndProvider.mockResolvedValue(mockUser);
      const command = new GoogleLoginCommand(profile);

      const result = await handler.execute(command);

      expect(userRepository.findBySocialIdAndProvider).toHaveBeenCalledWith({
        socialId: 'google-123',
        provider: AuthProvidersEnum.GOOGLE,
      });
      expect(sessionRepository.create).toHaveBeenCalled();
      expect(result.token).toBe('access-token');
      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(UserLoggedInEvent),
      );
    });

    it('should create new user if not found', async () => {
      userRepository.findBySocialIdAndProvider.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);

      const command = new GoogleLoginCommand(profile);
      await handler.execute(command);

      expect(userRepository.create).toHaveBeenCalledWith({
        email: profile.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        password: null,
        provider: AuthProvidersEnum.GOOGLE,
        socialId: profile.socialId,
        role: expect.any(Object),
        verifiedAt: expect.any(Date),
      });
      expect(sessionRepository.create).toHaveBeenCalled();
    });

    it('should reject an email already registered with another provider', async () => {
      userRepository.findBySocialIdAndProvider.mockResolvedValue(null);
      userRepository.findByEmail.mockResolvedValue(mockUser);

      const command = new GoogleLoginCommand(profile);
      await expect(handler.execute(command)).rejects.toMatchObject({
        response: {
          errors: {
            email: 'needLoginViaProvider:email',
          },
        },
      });

      expect(userRepository.create).not.toHaveBeenCalled();
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it('should reject a Google profile without an email address', async () => {
      userRepository.findBySocialIdAndProvider.mockResolvedValue(null);

      const command = new GoogleLoginCommand({
        ...profile,
        email: '   ',
      });

      await expect(handler.execute(command)).rejects.toMatchObject({
        response: {
          errors: {
            email: 'googleEmailRequired',
          },
        },
      });

      expect(userRepository.findByEmail).not.toHaveBeenCalled();
    });
  });
});
