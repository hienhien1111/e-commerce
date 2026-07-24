import { CommerceOperationStatusEnum } from '@/domain/enums/commerce-operation-status.enum';

export type CommerceOperation = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  status: CommerceOperationStatusEnum;
  attempts: number;
  availableAt: Date;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CommerceOperationPage = {
  data: CommerceOperation[];
  nextCursor: string | null;
};
