import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import type { CategoryRepositoryPort } from '@/application/catalog/ports/category.repository.port';
import { Category } from '@/domain/entities/category';
import { CategoryMapper } from '@/infrastructure/persistence/mappers/category.mapper';
import { NullableType } from '@/utils/types/nullable.type';

@Injectable()
export class PrismaCategoryRepository implements CategoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(category: Category): Promise<Category> {
    const data = CategoryMapper.toPersistence(category);
    const created = await this.prisma.category.create({ data });
    return CategoryMapper.toDomain(created);
  }

  async save(category: Category): Promise<Category> {
    const data = CategoryMapper.toPersistence(category);
    const updated = await this.prisma.category.update({
      where: { id: category.id },
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        parentId: data.parentId,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
        updatedAt: data.updatedAt,
        deletedAt: data.deletedAt,
      },
    });
    return CategoryMapper.toDomain(updated);
  }

  async findById(id: string): Promise<NullableType<Category>> {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null },
    });
    return category ? CategoryMapper.toDomain(category) : null;
  }

  async findPublicById(id: string): Promise<NullableType<Category>> {
    const category = await this.prisma.category.findFirst({
      where: { id, deletedAt: null, isActive: true },
    });
    return category ? CategoryMapper.toDomain(category) : null;
  }

  async findBySlug(slug: string): Promise<NullableType<Category>> {
    const category = await this.prisma.category.findUnique({ where: { slug } });
    return category ? CategoryMapper.toDomain(category) : null;
  }

  async findPublic({ parentId }: { parentId?: string }): Promise<Category[]> {
    const categories = await this.prisma.category.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        ...(parentId === undefined ? {} : { parentId }),
      },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
    });
    return categories.map((category) => CategoryMapper.toDomain(category));
  }

  async hasChildren(id: string): Promise<boolean> {
    return Boolean(
      await this.prisma.category.findFirst({
        where: { parentId: id, deletedAt: null },
        select: { id: true },
      }),
    );
  }
}
