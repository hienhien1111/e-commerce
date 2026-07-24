import { expect, Page, Route, test } from '@playwright/test';

const now = new Date().toISOString();
const orderId = '019f8e71-e000-7000-8000-000000000001';

const admin = {
  id: '019f8e71-e000-7000-8000-000000000010',
  email: 'admin@example.com',
  provider: 'email',
  firstName: 'Admin',
  lastName: 'Shop',
  phone: '0900000000',
  avatarUrl: null,
  verifiedAt: now,
  role: { name: 'admin' },
};

const customer = {
  ...admin,
  id: '019f8e71-e000-7000-8000-000000000011',
  email: 'customer@example.com',
  firstName: 'Customer',
  role: { name: 'customer' },
};

const address = {
  fullName: 'Nguyen Van A',
  phone: '0900000000',
  addressLine: '1 Nguyen Trai',
  ward: 'Phuong 1',
  district: 'Quan 1',
  city: 'Ho Chi Minh',
};

const order = {
  id: orderId,
  userId: customer.id,
  status: 'PENDING',
  subtotal: 100_000,
  discountAmount: 0,
  total: 100_000,
  paymentMethod: 'MOMO',
  paymentStatus: 'PENDING',
  reservationStatus: 'RESERVED',
  reservationExpiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
  cancellationReason: null,
  paidAt: null,
  shippingAddress: address,
  couponId: null,
  note: null,
  items: [],
  customer: {
    id: customer.id,
    email: customer.email,
    firstName: customer.firstName,
    lastName: customer.lastName,
  },
  createdAt: now,
  updatedAt: now,
};

const emptyCart = {
  id: null,
  items: [],
  itemCount: 0,
  subtotal: 0,
  discountAmount: 0,
  total: 0,
  checkoutReady: false,
  coupon: null,
};

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    headers: {
      'access-control-allow-credentials': 'true',
      'access-control-allow-origin': 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  });
}

async function openAdminNavigation(page: Page) {
  const mobileMenu = page.getByRole('button', { name: 'Mở menu quản trị' });
  if (await mobileMenu.isVisible()) await mobileMenu.click();
}

test('admin navigation, URL filters and refund retry work at each viewport', async ({
  page,
}) => {
  test.setTimeout(45_000);
  let retried = false;
  let orderProcessed = false;
  let productCreated = false;
  let categoryCreated = false;
  let couponCreated = false;
  let currentOrder = { ...order };
  const product = {
    id: '019f8e71-e000-7000-8000-000000000050',
    name: 'Áo cam quản trị',
    slug: 'ao-cam-quan-tri',
    description: null,
    price: 150_000,
    comparePrice: null,
    stock: 5,
    sku: 'AO-CAM-ADMIN',
    hasVariants: false,
    priceRange: { min: 150_000, max: 150_000 },
    categoryId: null,
    isActive: true,
    images: [],
    variants: [],
  };
  const category = {
    id: '019f8e71-e000-7000-8000-000000000060',
    name: 'Thời trang',
    slug: 'thoi-trang',
    description: null,
    parentId: null,
    sortOrder: 0,
    isActive: true,
  };
  const coupon = {
    id: '019f8e71-e000-7000-8000-000000000070',
    code: 'SUMMER10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    maxDiscount: null,
    minOrderAmount: null,
    maxUsage: null,
    usedCount: 0,
    expiresAt: null,
    isActive: true,
  };
  const operation = {
    id: '019f8e71-e000-7000-8000-000000000020',
    aggregateType: 'Payment',
    aggregateId: orderId,
    eventType: 'RefundReconciliationRequested',
    status: 'DEAD_LETTER',
    attempts: 10,
    availableAt: now,
    lastError: 'MoMo timeout after reconciliation query',
    createdAt: now,
    updatedAt: now,
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/v1/me')) return json(route, admin);
    if (url.pathname.endsWith('/v1/cart')) return json(route, emptyCart);
    if (url.pathname.endsWith('/v1/admin/stats')) {
      return json(route, {
        totalUsers: 4,
        totalProducts: 8,
        totalOrders: 12,
        totalRevenue: 1_250_000,
        revenueToday: 250_000,
        pendingOrders: 2,
        reservationFailures: 1,
        refundPending: 1,
        refundFailed: 1,
        recentOrders: [order],
      });
    }
    if (url.pathname.endsWith('/v1/admin/orders/stats')) {
      return json(route, {
        counts: {
          PENDING: 1,
          CONFIRMED: 0,
          PROCESSING: 0,
          SHIPPED: 0,
          DELIVERED: 0,
          CANCELLED: 0,
        },
        totalRevenue: 0,
      });
    }
    if (url.pathname.endsWith('/v1/admin/orders')) {
      return json(route, { data: [currentOrder], nextCursor: null });
    }
    if (
      url.pathname.endsWith(`/v1/admin/orders/${orderId}/status`) &&
      request.method() === 'PATCH'
    ) {
      orderProcessed = true;
      currentOrder = { ...currentOrder, status: 'CONFIRMED' };
      return json(route, currentOrder);
    }
    if (
      url.pathname.endsWith(`/v1/admin/orders/${orderId}`) &&
      request.method() === 'GET'
    ) {
      return json(route, currentOrder);
    }
    if (url.pathname.endsWith('/v1/admin/products')) {
      return json(route, {
        data: productCreated ? [product] : [],
        nextCursor: null,
      });
    }
    if (url.pathname.endsWith('/v1/admin/categories')) {
      return json(route, categoryCreated ? [category] : []);
    }
    if (url.pathname.endsWith('/v1/products') && request.method() === 'POST') {
      productCreated = true;
      return json(route, product, 201);
    }
    if (
      url.pathname.endsWith('/v1/categories') &&
      request.method() === 'POST'
    ) {
      categoryCreated = true;
      return json(route, category, 201);
    }
    if (url.pathname.endsWith('/v1/coupons')) {
      if (request.method() === 'POST') {
        couponCreated = true;
        return json(route, coupon, 201);
      }
      return json(route, couponCreated ? [coupon] : []);
    }
    if (
      url.pathname.endsWith(`/v1/admin/operations/${operation.id}/retry`) &&
      request.method() === 'POST'
    ) {
      retried = true;
      return json(route, { ...operation, status: 'PENDING', attempts: 0 });
    }
    if (url.pathname.endsWith('/v1/admin/operations')) {
      return json(route, { data: [operation], nextCursor: null });
    }
    return json(route, { message: 'Unhandled mock request' }, 404);
  });

  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByText('Reservation lỗi')).toBeVisible();

  const mobileMenu = page.getByRole('button', { name: 'Mở menu quản trị' });
  if (await mobileMenu.isVisible()) {
    await mobileMenu.click();
    await expect(page.getByRole('link', { name: /Tổng quan/ })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(mobileMenu).toBeFocused();
    await mobileMenu.click();
  } else {
    await page.getByRole('button', { name: 'Thu gọn sidebar' }).click();
    await expect(
      page.getByRole('button', { name: 'Mở rộng sidebar' }),
    ).toBeVisible();
  }

  await page.getByRole('link', { name: /Đơn hàng/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Quản lý đơn hàng' }),
  ).toBeVisible();
  await page
    .getByRole('textbox', { name: 'Tìm đơn hàng' })
    .fill('customer@example.com');
  await page.getByLabel('Phương thức').selectOption('MOMO');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('search'))
    .toBe('customer@example.com');
  expect(new URL(page.url()).searchParams.get('paymentMethod')).toBe('MOMO');

  await page.getByRole('link', { name: 'Chi tiết' }).first().click();
  await expect(page.getByRole('heading', { name: /Xử lý đơn/ })).toBeVisible();
  await page.getByRole('button', { name: 'Chuyển sang “Đã xác nhận”' }).click();
  await expect.poll(() => orderProcessed).toBe(true);
  await expect(
    page.getByText('Đã xác nhận', { exact: true }).first(),
  ).toBeVisible();

  await openAdminNavigation(page);
  await page.getByRole('link', { name: /Vận hành/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Tác vụ & hoàn tiền' }),
  ).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Chạy lại' }).click();
  await expect.poll(() => retried).toBe(true);

  await openAdminNavigation(page);
  await page.getByRole('link', { name: /Sản phẩm/ }).click();
  await expect(page.getByRole('heading', { name: 'Sản phẩm' })).toBeVisible();
  const createProduct = page.getByRole('button', { name: 'Thêm sản phẩm' });
  await createProduct.click();
  const productEditor = page.getByRole('dialog', { name: 'Thêm sản phẩm' });
  await expect(productEditor).toBeVisible();
  await expect(
    productEditor.getByLabel('Tên *', { exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(productEditor).toBeHidden();
  await expect(createProduct).toBeFocused();

  await page.getByRole('textbox', { name: 'Tìm sản phẩm' }).fill('áo cam');
  await page.getByLabel('Trạng thái sản phẩm').selectOption('true');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('search'))
    .toBe('áo cam');
  expect(new URL(page.url()).searchParams.get('isActive')).toBe('true');

  await createProduct.click();
  await productEditor.getByLabel('Tên *', { exact: true }).fill(product.name);
  await productEditor.getByLabel('Giá VND *').fill(String(product.price));
  await productEditor.getByLabel('Tồn kho').fill(String(product.stock));
  await productEditor.getByRole('button', { name: 'Lưu' }).click();
  await expect.poll(() => productCreated).toBe(true);

  await openAdminNavigation(page);
  await page.getByRole('link', { name: /Danh mục/ }).click();
  await page.getByRole('button', { name: 'Thêm danh mục' }).click();
  const categoryEditor = page.getByRole('dialog', { name: 'Thêm danh mục' });
  await categoryEditor.getByLabel('Tên *', { exact: true }).fill(category.name);
  await categoryEditor.getByRole('button', { name: 'Lưu' }).click();
  await expect.poll(() => categoryCreated).toBe(true);
  await page.getByRole('textbox', { name: 'Tìm danh mục' }).fill('thời trang');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('search'))
    .toBe('thời trang');

  await openAdminNavigation(page);
  await page.getByRole('link', { name: /Khuyến mãi/ }).click();
  await page.getByRole('button', { name: 'Thêm coupon' }).click();
  const couponEditor = page.getByRole('dialog', { name: 'Thêm coupon' });
  await couponEditor.getByLabel('Mã *').fill(coupon.code);
  await couponEditor.getByLabel('Giá trị *').fill(String(coupon.discountValue));
  await couponEditor.getByRole('button', { name: 'Lưu' }).click();
  await expect.poll(() => couponCreated).toBe(true);
  await page.getByRole('textbox', { name: 'Tìm coupon' }).fill('summer');
  await expect
    .poll(() => new URL(page.url()).searchParams.get('search'))
    .toBe('summer');
});

test('checkout waits for reservation before opening MoMo and renders expiry recovery', async ({
  page,
}) => {
  let submitted = false;
  const sequence: string[] = [];
  const cart = {
    id: '019f8e71-e000-7000-8000-000000000030',
    items: [
      {
        id: '019f8e71-e000-7000-8000-000000000031',
        productId: '019f8e71-e000-7000-8000-000000000032',
        variantId: '019f8e71-e000-7000-8000-000000000033',
        quantity: 1,
        product: {
          id: '019f8e71-e000-7000-8000-000000000032',
          variantId: '019f8e71-e000-7000-8000-000000000033',
          name: 'Áo cam',
          slug: 'ao-cam',
          label: 'M',
          sku: 'AO-CAM-M',
          price: 100_000,
          stock: 3,
          thumbnailUrl: null,
          isAvailable: true,
          availabilityReason: null,
        },
        isAvailable: true,
        availabilityReason: null,
      },
    ],
    itemCount: 1,
    subtotal: 100_000,
    discountAmount: 0,
    total: 100_000,
    checkoutReady: true,
    coupon: null,
  };

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname.endsWith('/v1/me')) return json(route, customer);
    if (url.pathname.endsWith('/v1/cart')) {
      return json(route, submitted ? emptyCart : cart);
    }
    if (url.pathname.endsWith('/v1/orders') && request.method() === 'POST') {
      submitted = true;
      sequence.push('submitted');
      return json(route, { ...order, reservationStatus: 'PENDING' }, 202);
    }
    if (
      url.pathname.endsWith(`/v1/orders/${orderId}`) &&
      request.method() === 'GET'
    ) {
      sequence.push('reserved');
      return json(route, order);
    }
    if (
      url.pathname.endsWith('/v1/payments/initiate') &&
      request.method() === 'POST'
    ) {
      sequence.push('payment');
      return json(
        route,
        {
          id: '019f8e71-e000-7000-8000-000000000040',
          orderId,
          provider: 'momo',
          amount: 100_000,
          status: 'PENDING',
          payUrl: 'https://momo.example/pay',
          qrCodeUrl: null,
          deeplink: null,
          expiresAt: new Date(Date.now() - 1_000).toISOString(),
          paidAt: null,
        },
        201,
      );
    }
    return json(route, { message: 'Unhandled mock request' }, 404);
  });

  await page.goto('/checkout');
  await expect(
    page.getByRole('heading', { name: 'Thanh toán', exact: true }),
  ).toBeVisible();
  for (const [label, value] of [
    ['Họ và tên', address.fullName],
    ['Số điện thoại', address.phone],
    ['Địa chỉ', address.addressLine],
    ['Phường/Xã', address.ward],
    ['Quận/Huyện', address.district],
    ['Tỉnh/Thành phố', address.city],
  ]) {
    await page.getByLabel(label, { exact: true }).fill(value);
  }
  await page.getByRole('radio', { name: /Ví MoMo/ }).check();
  await page
    .getByRole('button', { name: 'Đặt hàng và thanh toán MoMo' })
    .click();

  await expect(page).toHaveURL(`/orders/${orderId}/payment`);
  await expect(page.getByText('Phiên thanh toán đã hết hạn.')).toBeVisible();
  expect(sequence).toEqual(['submitted', 'reserved', 'payment']);
});
