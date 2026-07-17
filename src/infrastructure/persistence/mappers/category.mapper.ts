import type { Category as PrismaCategory } from '@/generated/prisma/client';
import { Category } from '@/domain/entities/category';
import { CategoryFactory } from '@/domain/factories/category.factory';

export class CategoryMapper {
  static toDomain(raw: PrismaCategory): Category {
    return CategoryFactory.reconstitute({
      id: raw.id,
      name: raw.name,
      slug: raw.slug,
      description: raw.description,
      parentId: raw.parentId,
      sortOrder: raw.sortOrder,
      isActive: raw.isActive,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      deletedAt: raw.deletedAt,
    });
  }

  static toPersistence(category: Category) {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      parentId: category.parentId,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
      deletedAt: category.deletedAt,
    };
  }
}
