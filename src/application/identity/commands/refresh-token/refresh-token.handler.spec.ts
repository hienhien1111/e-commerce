import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RefreshTokenHandler } from './refresh-token.handler';
import { RefreshTokenCommand } from './refresh-token.command';
import { SESSION_REPOSITORY_PORT } from '../../ports/session/session.repository.port.token';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { Session } from '@/domain/entities/session';
import { User } from '@/domain/entities/user';
import { Role } from '@/domain/entities/role';

describe('RefreshTokenHandler', () => {
  let handler: RefreshTokenHandler;
  let sessionRepository: jest.Mocked<{
    findById: jest.Mock;
    update: jest.Mock;
  }>;
  let userRepository: jest.Mocked<{ findById: jest.Mock }>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  const mockRole = { id: 'role-123', name: 'user' } as Role;
  const mockUser = {
    id: 'user-123',
    role: mockRole,
  } as User;
  const mockSession = {
    id: 'session-123',
    hash: 'session-hash',
    user: mockUser,
  } as Session;

  beforeEach(async () => {
    sessionRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    userRepository = { findById: jest.fn() };
    jwtService = {
      signAsync: jest.fn().mockResolvedValue('token'),
    } as unknown as jest.Mocked<JwtService>;
    configService = {
      getOrThrow: jest.fn().mockReturnValue('secret'),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenHandler,
        { provide: SESSION_REPOSITORY_PORT, useValue: sessionRepository },
        { provide: USER_REPOSITORY_PORT, useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    handler = module.get<RefreshTokenHandler>(RefreshTokenHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    beforeEach(() => {
      sessionRepository.findById.mockResolvedValue(mockSession);
      userRepository.findById.mockResolvedValue(mockUser);
      sessionRepository.update.mockResolvedValue(undefined);
    });

    it('should throw if session not found', async () => {
      sessionRepository.findById.mockResolvedValue(null);

      const command = new RefreshTokenCommand('session-123', 'hash');

      await expect(handler.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if hash does not match', async () => {
      const command = new RefreshTokenCommand('session-123', 'wrong-hash');

      await expect(handler.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw if user has no role', async () => {
      const userWithoutRole = { id: 'user-123', role: null } as User;
      userRepository.findById.mockResolvedValue(userWithoutRole);

      const command = new RefreshTokenCommand('session-123', 'session-hash');

      await expect(handler.execute(command)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should update session hash', async () => {
      const command = new RefreshTokenCommand('session-123', 'session-hash');

      await handler.execute(command);

      expect(sessionRepository.update).toHaveBeenCalledWith('session-123', {
        hash: expect.any(String),
      });
    });

    it('should return new tokens', async () => {
      const command = new RefreshTokenCommand('session-123', 'session-hash');

      const result = await handler.execute(command);

      expect(result).toEqual({
        token: 'token',
        refreshToken: 'token',
        tokenExpires: expect.any(Number),
      });
    });
  });
});
