import { ICommand } from '@nestjs/cqrs';

export type CreateCategoryPayload = {
  name: string;
  description?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
};

export class CreateCategoryCommand implements ICommand {
  constructor(public readonly payload: CreateCategoryPayload) {}
}
