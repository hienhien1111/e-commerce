import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CategoryRepositoryPort } from '@/application/catalog/ports/category.repository.port';
import { CATEGORY_REPOSITORY_PORT } from '@/application/catalog/ports/category.repository.port.token';

@Injectable()
export class CategoryHierarchyService {
  constructor(
    @Inject(CATEGORY_REPOSITORY_PORT)
    private readonly categoryRepository: CategoryRepositoryPort,
  ) {}

  async assertValidParent(
    parentId: string | null,
    currentCategoryId?: string,
  ): Promise<void> {
    if (parentId === null) return;
    if (parentId === currentCategoryId) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    const parent = await this.categoryRepository.findById(parentId);
    if (!parent) throw new NotFoundException('Parent category not found');
    if (parent.parentId !== null) {
      throw new BadRequestException('Categories support one child level only');
    }
  }
}
