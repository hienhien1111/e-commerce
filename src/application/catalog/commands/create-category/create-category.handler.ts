import {
  ConflictException,
  Inject,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CategoryFactory } from '@/domain/factories/category.factory';
import type { CategoryRepositoryPort } from '@/application/catalog/ports/category.repository.port';
import { CATEGORY_REPOSITORY_PORT } from '@/application/catalog/ports/category.repository.port.token';
import { CategoryHierarchyService } from '@/application/catalog/services/category-hierarchy.service';
import { slugify } from '@/utils/slugify';
import { CreateCategoryCommand } from './create-category.command';

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler
  implements ICommandHandler<CreateCategoryCommand>
{
  constructor(
    @Inject(CATEGORY_REPOSITORY_PORT)
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly hierarchy: CategoryHierarchyService,
  ) {}

  async execute(command: CreateCategoryCommand) {
    const slug = slugify(command.payload.name);
    if (!slug)
      throw new UnprocessableEntityException(
        'Category name cannot form a slug',
      );
    if (await this.categoryRepository.findBySlug(slug)) {
      throw new ConflictException('Category slug already exists');
    }

    const parentId = command.payload.parentId ?? null;
    await this.hierarchy.assertValidParent(parentId);

    return this.categoryRepository.create(
      CategoryFactory.create({
        name: command.payload.name.trim(),
        slug,
        description: command.payload.description?.trim() || null,
        parentId,
        sortOrder: command.payload.sortOrder ?? 0,
        isActive: command.payload.isActive ?? true,
      }),
    );
  }
}
