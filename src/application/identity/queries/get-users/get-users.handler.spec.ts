import { Test, TestingModule } from '@nestjs/testing';
import { GetUsersHandler } from './get-users.handler';
import { GetUsersQuery } from './get-users.query';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';
import { User } from '@/domain/entities/user';

describe('GetUsersHandler', () => {
  let handler: GetUsersHandler;
  let userRepository: jest.Mocked<{ findManyWithPagination: jest.Mock }>;

  const mockUsers = [
    { id: 'user-1', email: 'user1@example.com' },
    { id: 'user-2', email: 'user2@example.com' },
  ] as User[];

  const mockPaginatedResult = {
    data: mockUsers,
    hasNextPage: false,
  };

  beforeEach(async () => {
    userRepository = { findManyWithPagination: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetUsersHandler,
        { provide: USER_REPOSITORY_PORT, useValue: userRepository },
      ],
    }).compile();

    handler = module.get<GetUsersHandler>(GetUsersHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should throw if pagination options not provided', async () => {
      const query = new GetUsersQuery();

      await expect(handler.execute(query)).rejects.toThrow(
        'Pagination options are required',
      );
    });

    it('should return paginated users', async () => {
      userRepository.findManyWithPagination.mockResolvedValue(
        mockPaginatedResult,
      );

      const query = new GetUsersQuery(null, null, { limit: 10 });

      const result = await handler.execute(query);

      expect(userRepository.findManyWithPagination).toHaveBeenCalledWith({
        filterOptions: null,
        sortOptions: null,
        paginationOptions: { limit: 10 },
      });
      expect(result).toEqual(mockPaginatedResult);
    });

    it('should pass filter and sort options', async () => {
      userRepository.findManyWithPagination.mockResolvedValue(
        mockPaginatedResult,
      );

      const query = new GetUsersQuery(
        { roles: [] },
        [{ orderBy: 'createdAt', order: 'DESC' }],
        { limit: 10 },
      );

      await handler.execute(query);

      expect(userRepository.findManyWithPagination).toHaveBeenCalledWith({
        filterOptions: { roles: [] },
        sortOptions: [{ orderBy: 'createdAt', order: 'DESC' }],
        paginationOptions: { limit: 10 },
      });
    });
  });
});
