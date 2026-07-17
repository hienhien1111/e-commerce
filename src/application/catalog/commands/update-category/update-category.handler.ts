import {
  ConflictException,
  Inject,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { CategoryRepositoryPort } from '@/application/catalog/ports/category.repository.port';
import { CATEGORY_REPOSITORY_PORT } from '@/application/catalog/ports/category.repository.port.token';
import { CategoryHierarchyService } from '@/application/catalog/services/category-hierarchy.service';
import { slugify } from '@/utils/slugify';
import { UpdateCategoryCommand } from './update-category.command';

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler
  implements ICommandHandler<UpdateCategoryCommand>
{
  constructor(
    @Inject(CATEGORY_REPOSITORY_PORT)
    private readonly categoryRepository: CategoryRepositoryPort,
    private readonly hierarchy: CategoryHierarchyService,
  ) {}

  async execute(command: UpdateCategoryCommand) {
    const category = await this.categoryRepository.findById(command.id);
    if (!category) throw new NotFoundException('Category not found');

    const update: Record<string, unknown> = { ...command.payload };
    if (command.payload.parentId !== undefined) {
      await this.hierarchy.assertValidParent(
        command.payload.parentId,
        category.id,
      );
    }
    if (command.payload.name !== undefined) {
      const slug = slugify(command.payload.name);
      if (!slug)
        throw new UnprocessableEntityException(
          'Category name cannot form a slug',
        );
      const existing = await this.categoryRepository.findBySlug(slug);
      if (existing && existing.id !== category.id) {
        throw new ConflictException('Category slug already exists');
      }
      update.name = command.payload.name.trim();
      update.slug = slug;
    }
    if (command.payload.description !== undefined) {
      update.description = command.payload.description?.trim() || null;
    }
    category.update(update);
    return this.categoryRepository.save(category);
  }
}
