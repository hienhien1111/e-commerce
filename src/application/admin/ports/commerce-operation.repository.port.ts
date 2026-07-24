import {
  CommerceOperation,
  CommerceOperationPage,
} from '@/application/admin/types/commerce-operation.types';
import { CommerceOperationStatusEnum } from '@/domain/enums/commerce-operation-status.enum';

export interface CommerceOperationRepositoryPort {
  findPage(input: {
    status?: CommerceOperationStatusEnum;
    eventType?: string;
    cursor: string | null;
    limit: number;
  }): Promise<CommerceOperationPage>;
  findById(id: string): Promise<CommerceOperation | null>;
  retry(id: string): Promise<CommerceOperation | null>;
}
