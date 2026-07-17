import { ICommand } from '@nestjs/cqrs';
import { CreateCategoryPayload } from '../create-category/create-category.command';

export type UpdateCategoryPayload = Partial<CreateCategoryPayload>;

export class UpdateCategoryCommand implements ICommand {
  constructor(
    public readonly id: string,
    public readonly payload: UpdateCategoryPayload,
  ) {}
}
