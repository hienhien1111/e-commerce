import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { LogoutCommand } from './logout.command';
import { LogoutResult } from './logout.result';
import type { SessionRepositoryPort } from '../../ports/session/session.repository.port';
import { SESSION_REPOSITORY_PORT } from '../../ports/session/session.repository.port.token';

@CommandHandler(LogoutCommand)
export class LogoutHandler implements ICommandHandler<LogoutCommand> {
  constructor(
    @Inject(SESSION_REPOSITORY_PORT)
    private readonly sessionRepository: SessionRepositoryPort,
  ) {}

  async execute(command: LogoutCommand): Promise<LogoutResult> {
    const { sessionId } = command;
    return this.sessionRepository.deleteById(sessionId);
  }
}
