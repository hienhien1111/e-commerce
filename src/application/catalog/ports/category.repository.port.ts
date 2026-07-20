import { Category } from '@/domain/entities/category';
import { NullableType } from '@/utils/types/nullable.type';

export interface CategoryRepositoryPort {
  create(category: Category): Promise<Category>;
  save(category: Category): Promise<Category>;
  findById(id: string): Promise<NullableType<Category>>;
  findPublicById(id: string): Promise<NullableType<Category>>;
  findBySlug(slug: string): Promise<NullableType<Category>>;
  findPublic(params: { parentId?: string }): Promise<Category[]>;
  hasChildren(id: string): Promise<boolean>;
}
