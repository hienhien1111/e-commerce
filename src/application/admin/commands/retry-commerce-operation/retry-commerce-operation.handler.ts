import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CommerceOperationRepositoryPort } from '@/application/admin/ports/commerce-operation.repository.port';
import { COMMERCE_OPERATION_REPOSITORY_PORT } from '@/application/admin/ports/commerce-operation.repository.port.token';
import { ApplicationError } from '@/application/shared/errors/application.error';
import { CommerceOperationStatusEnum } from '@/domain/enums/commerce-operation-status.enum';
import { RetryCommerceOperationCommand } from './retry-commerce-operation.command';

@CommandHandler(RetryCommerceOperationCommand)
export class RetryCommerceOperationHandler
  implements ICommandHandler<RetryCommerceOperationCommand>
{
  constructor(
    @Inject(COMMERCE_OPERATION_REPOSITORY_PORT)
    private readonly operations: CommerceOperationRepositoryPort,
  ) {}

  async execute(command: RetryCommerceOperationCommand) {
    const existing = await this.operations.findById(command.operationId);
    if (!existing) {
      throw new ApplicationError(
        'COMMERCE_OPERATION_NOT_FOUND',
        'Commerce operation not found',
        'NOT_FOUND',
      );
    }
    if (existing.status !== CommerceOperationStatusEnum.DEAD_LETTER) {
      throw new ApplicationError(
        'COMMERCE_OPERATION_NOT_RETRYABLE',
        'Only dead-letter operations can be retried',
        'CONFLICT',
      );
    }
    const retried = await this.operations.retry(command.operationId);
    if (!retried) {
      throw new ApplicationError(
        'COMMERCE_OPERATION_RETRY_CONFLICT',
        'Commerce operation changed while retrying',
        'CONFLICT',
        true,
      );
    }
    return retried;
  }
}
