import { Test, TestingModule } from '@nestjs/testing';
import { GetUserHandler } from './get-user.handler';
import { GetUserQuery } from './get-user.query';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { User } from '@/domain/entities/user';

describe('GetUserHandler', () => {
  let handler: GetUserHandler;
  let userRepository: jest.Mocked<{ findById: jest.Mock }>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
  } as User;

  beforeEach(async () => {
    userRepository = { findById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUserHandler,
        { provide: USER_REPOSITORY_PORT, useValue: userRepository },
      ],
    }).compile();

    handler = module.get<GetUserHandler>(GetUserHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return user by id', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const query = new GetUserQuery('user-123');

      const result = await handler.execute(query);

      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      const query = new GetUserQuery('non-existent');

      const result = await handler.execute(query);

      expect(result).toBeNull();
    });
  });
});
