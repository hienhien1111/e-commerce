import { ProductFactory } from '@/domain/factories/product.factory';
import { ProductImageFactory } from '@/domain/factories/product-image.factory';
import { ProductVariantFactory } from '@/domain/factories/product-variant.factory';
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
        variants: [
          ProductVariantFactory.create({
            productId: 'product-invalid-price',
            label: null,
            sku: 'INVALID-PRICE',
            price: 0,
            comparePrice: null,
            stock: 0,
            isActive: true,
            imageId: null,
            imageUrl: null,
          }),
        ],
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
        variants: [
          ProductVariantFactory.create({
            productId: 'product-invalid-compare-price',
            label: null,
            sku: 'INVALID-COMPARE',
            price: 10,
            comparePrice: 10,
            stock: 0,
            isActive: true,
            imageId: null,
            imageUrl: null,
          }),
        ],
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

  it('uses variants as its price, stock, and effective SKU projection', () => {
    const defaultVariant = ProductVariantFactory.create({
      id: 'variant-default',
      productId: 'product-1',
      label: null,
      sku: 'TSHIRT-DEFAULT',
      price: 100_000,
      comparePrice: null,
      stock: 2,
      isActive: true,
      imageId: null,
      imageUrl: null,
    });
    const product = ProductFactory.create({
      id: 'product-1',
      name: 'Áo thun',
      slug: 'ao-thun',
      description: null,
      price: 100_000,
      comparePrice: null,
      stock: 2,
      sku: null,
      categoryId: null,
      isActive: true,
      images: [],
      variants: [defaultVariant],
    });
    const blackLarge = ProductVariantFactory.create({
      productId: product.id,
      label: 'Đen - L',
      sku: 'TSHIRT-BLACK-L',
      price: 120_000,
      comparePrice: 150_000,
      stock: 3,
      isActive: true,
      imageId: null,
      imageUrl: null,
    });

    expect(product.sku).toBe('TSHIRT-DEFAULT');
    expect(() => product.addVariant(blackLarge)).toThrow(
      'Hidden default variant must be labelled before adding variants',
    );

    defaultVariant.update({ label: 'Đen - M' });
    product.addVariant(blackLarge);
    expect(product.hasVariants).toBe(true);
    expect(product.priceRange).toEqual({ min: 100_000, max: 120_000 });
    expect(product.stock).toBe(5);
    expect(product.sku).toBeNull();
    expect(() => product.removeVariant(blackLarge.id)).not.toThrow();
    expect(product.stock).toBe(2);
    expect(product.sku).toBe('TSHIRT-DEFAULT');
  });
});
