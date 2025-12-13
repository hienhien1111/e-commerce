import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { CreateUserHandler } from './create-user.handler';
import { CreateUserCommand } from './create-user.command';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { PASSWORD_HASHER_PORT } from '../../ports/password-hasher/password-hasher.port.token';
import { User } from '@/domain/entities/user';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';

describe('CreateUserHandler', () => {
  let handler: CreateUserHandler;
  let userRepository: jest.Mocked<{
    findByEmail: jest.Mock;
    create: jest.Mock;
  }>;
  let passwordHasher: jest.Mocked<{ hash: jest.Mock }>;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateUserHandler,
        { provide: USER_REPOSITORY_PORT, useValue: userRepository },
        { provide: PASSWORD_HASHER_PORT, useValue: passwordHasher },
      ],
    }).compile();

    handler = module.get<CreateUserHandler>(CreateUserHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    beforeEach(() => {
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.create.mockResolvedValue(mockUser);
      passwordHasher.hash.mockResolvedValue('hashed-password');
    });

    it('should throw if email already exists', async () => {
      userRepository.findByEmail.mockResolvedValue(mockUser);

      const command = new CreateUserCommand({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await expect(handler.execute(command)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should hash password if provided', async () => {
      const command = new CreateUserCommand({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler.execute(command);

      expect(passwordHasher.hash).toHaveBeenCalledWith('password123');
    });

    it('should create user with correct data', async () => {
      const command = new CreateUserCommand({
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler.execute(command);

      expect(userRepository.create).toHaveBeenCalledWith({
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        password: 'hashed-password',
        roleId: null,
        provider: AuthProvidersEnum.EMAIL,
        socialId: null,
      });
    });

    it('should create user without password if not provided', async () => {
      const command = new CreateUserCommand({
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });

      await handler.execute(command);

      expect(passwordHasher.hash).not.toHaveBeenCalled();
      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          password: undefined,
        }),
      );
    });
  });
});
