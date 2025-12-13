import { Test, TestingModule } from '@nestjs/testing';
import { DeleteUserHandler } from './delete-user.handler';
import { DeleteUserCommand } from './delete-user.command';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';

describe('DeleteUserHandler', () => {
  let handler: DeleteUserHandler;
  let userRepository: jest.Mocked<{ remove: jest.Mock }>;

  beforeEach(async () => {
    userRepository = { remove: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteUserHandler,
        { provide: USER_REPOSITORY_PORT, useValue: userRepository },
      ],
    }).compile();

    handler = module.get<DeleteUserHandler>(DeleteUserHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should remove user by id', async () => {
      userRepository.remove.mockResolvedValue(undefined);

      const command = new DeleteUserCommand('user-123');

      await handler.execute(command);

      expect(userRepository.remove).toHaveBeenCalledWith('user-123');
    });
  });
});
