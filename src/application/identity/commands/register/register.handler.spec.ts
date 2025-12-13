import { Test, TestingModule } from '@nestjs/testing';
import { EventBus } from '@nestjs/cqrs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnprocessableEntityException } from '@nestjs/common';
import { RegisterHandler } from './register.handler';
import { RegisterCommand } from './register.command';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { PASSWORD_HASHER_PORT } from '../../ports/password-hasher/password-hasher.port.token';
import { ROLE_REPOSITORY_PORT } from '@/application/authorization/ports/tokens';
import { UserRegisteredEvent } from '@/domain/events/user-registered.event';
import { User } from '@/domain/entities/user';
import { Role } from '@/domain/entities/role';
import { RoleEnum } from '@/domain/enums/role.enum';

describe('RegisterHandler', () => {
  let handler: RegisterHandler;
  let userRepository: jest.Mocked<{
    findByEmail: jest.Mock;
    create: jest.Mock;
  }>;
  let passwordHasher: jest.Mocked<{ hash: jest.Mock }>;
  let roleRepository: jest.Mocked<{ findByName: jest.Mock }>;
  let jwtService: jest.Mocked<JwtService>;
  let eventBus: jest.Mocked<EventBus>;

  const mockRole = { id: 'role-123', name: RoleEnum.USER } as Role;
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  } as User;

  beforeEach(async () => {
    userRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
    };
    passwordHasher = { hash: jest.fn() };
    roleRepository = { findByName: jest.fn() };
    jwtService = { signAsync: jest.fn() } as unknown as jest.Mocked<JwtService>;
    eventBus = { publish: jest.fn() } as unknown as jest.Mocked<EventBus>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterHandler,
        { provide: USER_REPOSITORY_PORT, useValue: userRepository },
        { provide: PASSWORD_HASHER_PORT, useValue: passwordHasher },
        { provide: ROLE_REPOSITORY_PORT, useValue: roleRepository },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: { getOrThrow: jest.fn().mockReturnValue('secret') },
        },
        { provide: EventBus, useValue: eventBus },
      ],
    }).compile();

    handler = module.get<RegisterHandler>(RegisterHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    beforeEach(() => {
      roleRepository.findByName.mockResolvedValue(mockRole);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);
      passwordHasher.hash.mockResolvedValue('hashed-password');
      jwtService.signAsync.mockResolvedValue('token');
    });

    it('should throw if default role not found', async () => {
      roleRepository.findByName.mockResolvedValue(null);

      const command = new RegisterCommand({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await expect(handler.execute(command)).rejects.toThrow(
        'Default user role not found',
      );
    });

    it('should throw if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      const command = new RegisterCommand({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await expect(handler.execute(command)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should hash password before creating user', async () => {
      const command = new RegisterCommand({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler.execute(command);

      expect(passwordHasher.hash).toHaveBeenCalledWith('password123');
    });

    it('should create user with correct data', async () => {
      const command = new RegisterCommand({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler.execute(command);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          password: 'hashed-password',
          firstName: 'John',
          lastName: 'Doe',
          role: mockRole,
        }),
      );
    });

    it('should publish UserRegisteredEvent', async () => {
      const command = new RegisterCommand({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler.execute(command);

      expect(eventBus.publish).toHaveBeenCalledWith(
        expect.any(UserRegisteredEvent),
      );
    });
  });
});
