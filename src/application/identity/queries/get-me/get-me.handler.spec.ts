import { Test, TestingModule } from '@nestjs/testing';
import { GetMeHandler } from './get-me.handler';
import { GetMeQuery } from './get-me.query';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { User } from '@/domain/entities/user';

describe('GetMeHandler', () => {
  let handler: GetMeHandler;
  let userRepository: jest.Mocked<{
    findById: jest.Mock;
  }>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
  } as User;

  beforeEach(async () => {
    userRepository = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetMeHandler,
        { provide: USER_REPOSITORY_PORT, useValue: userRepository },
      ],
    }).compile();

    handler = module.get<GetMeHandler>(GetMeHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return user by id from jwt payload', async () => {
      userRepository.findById.mockResolvedValue(mockUser);

      const query = new GetMeQuery('user-123');

      const result = await handler.execute(query);

      expect(userRepository.findById).toHaveBeenCalledWith('user-123');
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      userRepository.findById.mockResolvedValue(null);

      const query = new GetMeQuery('non-existent-user');

      const result = await handler.execute(query);

      expect(result).toBeNull();
    });
  });
});
