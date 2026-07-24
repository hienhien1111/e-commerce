import { HttpResponse, http } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '@/providers/ToastProvider';
import { server } from '@/test/server';
import { AdminProductsScreen } from './AdminProductsScreen';

const createdProduct = {
  id: '019c8fcb-82a7-7000-9000-000000000101',
  name: 'Áo thun',
  slug: 'ao-thun',
  description: null,
  price: 100000,
  comparePrice: null,
  stock: 8,
  sku: null,
  categoryId: null,
  isActive: true,
  hasVariants: true,
  priceRange: { min: 100000, max: 120000 },
  images: [],
  variants: [],
};

describe('AdminProductsScreen', () => {
  it('queues variants in the create drawer and submits one atomic product request', async () => {
    const user = userEvent.setup();
    let requestBody: unknown;
    server.use(
      http.get('http://localhost:3002/api/v1/admin/products', () =>
        HttpResponse.json({ data: [], nextCursor: null }),
      ),
      http.get('http://localhost:3002/api/v1/admin/categories', () =>
        HttpResponse.json([]),
      ),
      http.post(
        'http://localhost:3002/api/v1/products',
        async ({ request }) => {
          requestBody = await request.json();
          return HttpResponse.json(createdProduct, { status: 201 });
        },
      ),
    );

    render(
      <ToastProvider>
        <AdminProductsScreen />
      </ToastProvider>,
    );

    await user.click(
      await screen.findByRole('button', { name: 'Thêm sản phẩm' }),
    );
    await user.type(screen.getByLabelText('Tên *'), 'Áo thun');
    await user.type(
      screen.getByPlaceholderText('Nhãn, ví dụ: Đen - L'),
      'Đen - M',
    );
    await user.type(screen.getByPlaceholderText('SKU *'), 'TEE-BLACK-M');
    await user.type(screen.getByPlaceholderText('Giá *'), '100000');
    await user.clear(screen.getByPlaceholderText('Tồn kho *'));
    await user.type(screen.getByPlaceholderText('Tồn kho *'), '3');
    await user.click(
      screen.getByRole('button', { name: 'Thêm vào danh sách' }),
    );

    await user.type(
      screen.getByPlaceholderText('Nhãn, ví dụ: Đen - L'),
      'Trắng - L',
    );
    await user.type(screen.getByPlaceholderText('SKU *'), 'TEE-WHITE-L');
    await user.type(screen.getByPlaceholderText('Giá *'), '120000');
    await user.clear(screen.getByPlaceholderText('Tồn kho *'));
    await user.type(screen.getByPlaceholderText('Tồn kho *'), '5');
    await user.click(
      screen.getByRole('button', { name: 'Thêm vào danh sách' }),
    );

    expect(screen.getByText('Đen - M')).toBeInTheDocument();
    expect(screen.getByText('Trắng - L')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() =>
      expect(requestBody).toEqual({
        name: 'Áo thun',
        description: null,
        categoryId: null,
        isActive: true,
        price: 100000,
        comparePrice: null,
        stock: 3,
        sku: 'TEE-BLACK-M',
        variants: [
          {
            label: 'Đen - M',
            sku: 'TEE-BLACK-M',
            price: 100000,
            comparePrice: null,
            stock: 3,
            isActive: true,
          },
          {
            label: 'Trắng - L',
            sku: 'TEE-WHITE-L',
            price: 120000,
            comparePrice: null,
            stock: 5,
            isActive: true,
          },
        ],
      }),
    );
  });
});
