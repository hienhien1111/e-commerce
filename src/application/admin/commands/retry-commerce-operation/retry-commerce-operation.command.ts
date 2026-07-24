import { ICommand } from '@nestjs/cqrs';

export class RetryCommerceOperationCommand implements ICommand {
  constructor(public readonly operationId: string) {}
}
