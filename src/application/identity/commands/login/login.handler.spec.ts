import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { LoginHandler } from './login.handler';
import { AuthLoginCommand } from './login.command';
import { SESSION_REPOSITORY_PORT } from '../../ports/session/session.repository.port.token';
import { TOKEN_PORT } from '../../ports/token/token.port.token';
import { LoginStrategyResolver } from '@/application/identity/factories/auth-strategy.factory';
import { UserLoggedInEvent } from '@/domain/events/user-logged-in.event';
import { User } from '@/domain/entities/user';
import { Session } from '@/domain/entities/session';

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let sessionRepository: jest.Mocked<{
    create: jest.Mock;
  }>;
  let tokenPort: jest.Mocked<{
    signAccessToken: jest.Mock;
    signRefreshToken: jest.Mock;
  }>;
  let eventBus: jest.Mocked<EventBus>;
  let strategyResolver: jest.Mocked<LoginStrategyResolver>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: { id: 'role-123' },
  } as User;

  const mockSession = {
    id: 'session-123',
    hash: 'test-hash',
  } as Session;

  beforeEach(async () => {
    sessionRepository = {
      create: jest.fn(),
    };

    tokenPort = {
      signAccessToken: jest.fn(),
      signRefreshToken: jest.fn(),
    };

    eventBus = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<EventBus>;

    const mockStrategy = {
      execute: jest.fn().mockResolvedValue({ user: mockUser }),
    };

    strategyResolver = {
      resolve: jest.fn().mockReturnValue(mockStrategy),
    } as unknown as jest.Mocked<LoginStrategyResolver>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginHandler,
        { provide: SESSION_REPOSITORY_PORT, useValue: sessionRepository },
        { provide: TOKEN_PORT, useValue: tokenPort },
        { provide: EventBus, useValue: eventBus },
        { provide: LoginStrategyResolver, useValue: strategyResolver },
      ],
    }).compile();

    handler = module.get<LoginHandler>(LoginHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    const loginPayload = {
      email: 'test@example.com',
      password: 'password123',
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
    });

    it('should resolve login strategy', async () => {
      const command = new AuthLoginCommand(loginPayload);

      await handler.execute(command);

      expect(strategyResolver.resolve).toHaveBeenCalledWith(loginPayload);
    });

    it('should create a session for the user', async () => {
      const command = new AuthLoginCommand(loginPayload);

      await handler.execute(command);

      expect(sessionRepository.create).toHaveBeenCalledWith({
        user: mockUser,
        hash: expect.any(String),
      });
    });

    it('should sign access token with correct payload', async () => {
      const command = new AuthLoginCommand(loginPayload);

      await handler.execute(command);

      expect(tokenPort.signAccessToken).toHaveBeenCalledWith({
        id: mockUser.id,
        role: mockUser.role,
        sessionId: mockSession.id,
      });
    });

    it('should sign refresh token with session id and hash', async () => {
      const command = new AuthLoginCommand(loginPayload);

      await handler.execute(command);

      expect(tokenPort.signRefreshToken).toHaveBeenCalledWith({
        sessionId: mockSession.id,
        hash: expect.any(String),
      });
    });

    it('should publish UserLoggedInEvent', async () => {
      const command = new AuthLoginCommand(loginPayload);

      await handler.execute(command);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(UserLoggedInEvent),
      );
    });

    it('should return login result with tokens and user', async () => {
      const command = new AuthLoginCommand(loginPayload);

      const result = await handler.execute(command);

      expect(result).toEqual({
        token: 'access-token',
        refreshToken: 'refresh-token',
        tokenExpires: expect.any(Number),
        user: mockUser,
      });
    });
  });
});
