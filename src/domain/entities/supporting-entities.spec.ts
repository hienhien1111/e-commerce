import { CartItemFactory } from '@/domain/factories/cart-item.factory';
import { OrderItemFactory } from '@/domain/factories/order-item.factory';
import { ProductImageFactory } from '@/domain/factories/product-image.factory';
import { PermissionFactory } from '@/domain/factories/permission.factory';
import { RoleFactory } from '@/domain/factories/role.factory';
import { SessionFactory } from '@/domain/factories/session.factory';
import { UserFactory } from '@/domain/factories/user.factory';
import { WebAuthnCredential } from '@/domain/entities/webauthn-credential';
import { AuthProvidersEnum } from '@/domain/enums/auth-providers.enum';
import { PermissionActionEnum } from '@/domain/enums/permission-action.enum';
import { PermissionSubjectEnum } from '@/domain/enums/permission-subject.enum';

describe('supporting domain entities', () => {
  const user = () =>
    UserFactory.create({
      email: 'user@example.com',
      password: 'hashed-password',
      provider: AuthProvidersEnum.EMAIL,
      socialId: null,
      firstName: 'Jane',
      lastName: 'Doe',
      role: null,
    });

  it('validates and updates cart item quantities', () => {
    const item = CartItemFactory.create({
      id: 'cart-item',
      productId: 'product-1',
      quantity: 1,
    });

    item.setQuantity(3);

    expect(item.quantity).toBe(3);
    expect(item.toJSON()).toMatchObject({
      productId: 'product-1',
      quantity: 3,
    });
    expect(() =>
      CartItemFactory.create({ productId: '', quantity: 1 }),
    ).toThrow('Cart item product is required');
    expect(() => item.setQuantity(0)).toThrow(
      'Cart item quantity must be a positive integer',
    );
  });

  it('requires order item totals to match its immutable price snapshot', () => {
    const item = OrderItemFactory.create({
      id: 'order-item',
      productId: 'product-1',
      quantity: 2,
      unitPrice: 125_000,
      totalPrice: 250_000,
      snapshot: { name: 'Product', sku: 'SKU-1', imageUrl: null },
    });

    expect(item.toJSON()).toMatchObject({
      productId: 'product-1',
      quantity: 2,
      unitPrice: 125_000,
      totalPrice: 250_000,
    });
    expect(() =>
      OrderItemFactory.create({
        productId: 'product-1',
        quantity: 2,
        unitPrice: 125_000,
        totalPrice: 1,
        snapshot: { name: 'Product', sku: null, imageUrl: null },
      }),
    ).toThrow('Order item total must match unit price and quantity');
  });

  it('keeps product storage IDs internal while allowing primary promotion', () => {
    const image = ProductImageFactory.create({
      id: 'image-1',
      url: 'https://cdn.example/product.png',
      publicId: 'products/product-1/image-1',
      isPrimary: false,
      sortOrder: 0,
    });

    image.setPrimary(true);

    expect(image.toJSON()).toEqual({
      id: 'image-1',
      url: 'https://cdn.example/product.png',
      isPrimary: true,
      sortOrder: 0,
      createdAt: image.createdAt,
    });
    expect(() =>
      ProductImageFactory.create({
        url: 'https://cdn.example/product.png',
        publicId: 'id',
        isPrimary: false,
        sortOrder: -1,
      }),
    ).toThrow('Product image sort order must be a non-negative integer');
  });

  it('manages role permissions and serializes permission conditions', () => {
    const permission = PermissionFactory.create({
      name: 'Read products',
      action: PermissionActionEnum.READ,
      subject: PermissionSubjectEnum.PRODUCT,
      conditions: { isActive: true },
    });
    const role = RoleFactory.create({
      name: 'catalog-manager',
      permissions: [],
    });

    role.assignPermissions([permission]);
    permission.updateConditions({ categoryId: 'category-1' });

    expect(role.permissions).toEqual([permission]);
    expect(permission.toJSON()).toMatchObject({
      action: PermissionActionEnum.READ,
      subject: PermissionSubjectEnum.PRODUCT,
      conditions: { categoryId: 'category-1' },
    });
    role.clearPermissions();
    expect(role.permissions).toBeNull();
    expect(() => RoleFactory.create({ name: ' ', permissions: null })).toThrow(
      'Role name is required',
    );
  });

  it('serializes sessions and validates their essential fields', () => {
    const session = SessionFactory.create({
      user: user(),
      hash: 'refresh-hash',
    });

    session.updateHash('rotated-hash');

    expect(session.toJSON()).toMatchObject({
      hash: 'rotated-hash',
      deletedAt: null,
    });
    expect(() => SessionFactory.create({ user: user(), hash: ' ' })).toThrow(
      'Session hash is required',
    );
  });

  it('prevents WebAuthn counters from moving backwards and records use', () => {
    const credential = WebAuthnCredential._create(
      {
        userId: 'user-1',
        credentialId: 'credential-1',
        publicKey: 'public-key',
        counter: 1,
        transports: ['internal'],
        backedUp: false,
        deviceType: 'singleDevice',
        aaguid: null,
        lastUsedAt: null,
      },
      'credential-record-1',
    );

    credential.updateCounter(2);
    credential.markAsUsed();

    expect(credential.counter).toBe(2);
    expect(credential.lastUsedAt).toBeInstanceOf(Date);
    expect(() => credential.updateCounter(1)).toThrow(
      'Counter can only increase',
    );
  });
});
