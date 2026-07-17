import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { UpdateUserHandler } from './update-user.handler';
import { UpdateUserCommand } from './update-user.command';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { PASSWORD_HASHER_PORT } from '../../ports/password-hasher/password-hasher.port.token';
import { User } from '@/domain/entities/user';

describe('UpdateUserHandler', () => {
  let handler: UpdateUserHandler;
  let userRepository: jest.Mocked<{
    findById: jest.Mock;
    findByEmail: jest.Mock;
    update: jest.Mock;
  }>;
  let passwordHasher: jest.Mocked<{ hash: jest.Mock }>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    password: 'old-hashed-password',
  } as User;

  beforeEach(async () => {
    userRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
    };
    passwordHasher = { hash: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateUserHandler,
        { provide: USER_REPOSITORY_PORT, useValue: userRepository },
        { provide: PASSWORD_HASHER_PORT, useValue: passwordHasher },
      ],
    }).compile();

    handler = module.get<UpdateUserHandler>(UpdateUserHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    beforeEach(() => {
      userRepository.findById.mockResolvedValue(mockUser);
      userRepository.findByEmail.mockResolvedValue(null);
      userRepository.update.mockResolvedValue(undefined);
      passwordHasher.hash.mockResolvedValue('new-hashed-password');
    });

    it('should throw if email already exists for another user', async () => {
      const otherUser = {
        id: 'other-user',
        email: 'existing@example.com',
      } as User;
      userRepository.findByEmail.mockResolvedValue(otherUser);

      const command = new UpdateUserCommand('user-123', {
        email: 'existing@example.com',
      });

      await expect(handler.execute(command)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('should hash new password if different from current', async () => {
      const command = new UpdateUserCommand('user-123', {
        password: 'new-password',
      });

      await handler.execute(command);

      expect(passwordHasher.hash).toHaveBeenCalledWith('new-password');
    });

    it('should not hash password if same as current', async () => {
      const command = new UpdateUserCommand('user-123', {
        password: 'old-hashed-password',
      });

      await handler.execute(command);

      expect(passwordHasher.hash).not.toHaveBeenCalled();
    });

    it('should update user with correct data', async () => {
      const command = new UpdateUserCommand('user-123', {
        firstName: 'Jane',
        lastName: 'Smith',
      });

      await handler.execute(command);

      expect(userRepository.update).toHaveBeenCalledWith('user-123', {
        firstName: 'Jane',
        lastName: 'Smith',
        email: undefined,
        password: undefined,
        roleId: undefined,
        provider: undefined,
        socialId: undefined,
        phone: undefined,
      });
    });

    it('should update the phone number, including clearing it', async () => {
      const command = new UpdateUserCommand('user-123', {
        phone: null,
      });

      await handler.execute(command);

      expect(userRepository.update).toHaveBeenCalledWith('user-123', {
        firstName: undefined,
        lastName: undefined,
        email: undefined,
        password: undefined,
        roleId: undefined,
        provider: undefined,
        socialId: undefined,
        phone: null,
      });
    });
  });
});
