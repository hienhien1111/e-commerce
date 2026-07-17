import { ProductFactory } from '@/domain/factories/product.factory';
import { ProductImageFactory } from '@/domain/factories/product-image.factory';
import { InsufficientStockException } from '@/domain/exceptions/insufficient-stock.exception';

describe('Product', () => {
  const createProduct = () =>
    ProductFactory.create({
      name: 'Tai nghe',
      slug: 'tai-nghe',
      description: null,
      price: 100000,
      comparePrice: 120000,
      stock: 3,
      sku: null,
      categoryId: null,
      isActive: true,
      images: [],
    });

  it('enforces VND price and stock invariants', () => {
    expect(() =>
      ProductFactory.create({
        name: 'Bad',
        slug: 'bad',
        description: null,
        price: -1,
        comparePrice: null,
        stock: 0,
        sku: null,
        categoryId: null,
        isActive: true,
        images: [],
      }),
    ).toThrow('Product price must be a non-negative integer');
    expect(() =>
      ProductFactory.create({
        name: 'Bad',
        slug: 'bad',
        description: null,
        price: 10,
        comparePrice: 9,
        stock: 0,
        sku: null,
        categoryId: null,
        isActive: true,
        images: [],
      }),
    ).toThrow('Product compare price must be at least the price');
  });

  it('increments and decrements stock safely', () => {
    const product = createProduct();
    product.decrementStock(2);
    product.incrementStock(1);
    expect(product.stock).toBe(2);
    expect(() => product.decrementStock(3)).toThrow(InsufficientStockException);
  });

  it('promotes the next image when the primary image is removed', () => {
    const product = createProduct();
    const first = ProductImageFactory.create({
      url: 'https://example.com/one.png',
      publicId: 'one',
      isPrimary: false,
      sortOrder: 0,
    });
    const second = ProductImageFactory.create({
      url: 'https://example.com/two.png',
      publicId: 'two',
      isPrimary: false,
      sortOrder: 1,
    });
    product.addImage(first);
    product.addImage(second);
    expect(first.isPrimary).toBe(true);

    product.removeImage(first.id);
    expect(second.isPrimary).toBe(true);
  });
});
