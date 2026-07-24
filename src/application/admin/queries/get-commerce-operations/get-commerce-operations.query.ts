import { IQuery } from '@nestjs/cqrs';
import { CommerceOperationStatusEnum } from '@/domain/enums/commerce-operation-status.enum';

export class GetCommerceOperationsQuery implements IQuery {
  constructor(
    public readonly status: CommerceOperationStatusEnum | undefined,
    public readonly eventType: string | undefined,
    public readonly cursor: string | null,
    public readonly limit: number,
  ) {}
}
