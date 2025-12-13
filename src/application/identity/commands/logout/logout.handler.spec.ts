import { Test, TestingModule } from '@nestjs/testing';
import { LogoutHandler } from './logout.handler';
import { LogoutCommand } from './logout.command';
import { SESSION_REPOSITORY_PORT } from '../../ports/session/session.repository.port.token';

describe('LogoutHandler', () => {
  let handler: LogoutHandler;
  let sessionRepository: jest.Mocked<{ deleteById: jest.Mock }>;

  beforeEach(async () => {
    sessionRepository = { deleteById: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogoutHandler,
        { provide: SESSION_REPOSITORY_PORT, useValue: sessionRepository },
      ],
    }).compile();

    handler = module.get<LogoutHandler>(LogoutHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should delete session by id', async () => {
      sessionRepository.deleteById.mockResolvedValue(undefined);

      const command = new LogoutCommand('session-123');

      await handler.execute(command);

      expect(sessionRepository.deleteById).toHaveBeenCalledWith('session-123');
    });
  });
});
