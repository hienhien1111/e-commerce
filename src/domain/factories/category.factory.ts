import { Category, CategoryProps } from '@/domain/entities/category';
import { generateUuidV7 } from '@/utils/uuid-v7';

export type CreateCategoryInput = CategoryProps & { id?: string };
export type ReconstituteCategoryInput = CategoryProps & {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class CategoryFactory {
  static create(input: CreateCategoryInput): Category {
    return Category._create(input, input.id ?? generateUuidV7());
  }

  static reconstitute(input: ReconstituteCategoryInput): Category {
    return Category._create(
      input,
      input.id,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
    );
  }
}
