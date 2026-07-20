import { CategoryFactory } from '@/domain/factories/category.factory';

describe('Category', () => {
  const createCategory = () =>
    CategoryFactory.create({
      name: 'Điện thoại',
      slug: 'dien-thoai',
      description: null,
      parentId: null,
      sortOrder: 0,
      isActive: true,
    });

  it('requires a name and a slug', () => {
    expect(() =>
      CategoryFactory.create({
        name: ' ',
        slug: '',
        description: null,
        parentId: null,
        sortOrder: 0,
        isActive: true,
      }),
    ).toThrow('Category name is required');
  });

  it('updates its timestamp and soft deletes once', () => {
    const category = createCategory();
    const initialUpdatedAt = category.updatedAt;
    category.update({ name: 'Điện thoại mới', slug: 'dien-thoai-moi' });
    expect(category.name).toBe('Điện thoại mới');
    expect(category.updatedAt.getTime()).toBeGreaterThanOrEqual(
      initialUpdatedAt.getTime(),
    );

    category.softDelete();
    const deletedAt = category.deletedAt;
    category.softDelete();
    expect(category.deletedAt).toBe(deletedAt);
  });
});
