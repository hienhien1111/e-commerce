import { HttpResponse, http } from 'msw';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { server } from '@/test/server';
import { AdminOperationsScreen } from './AdminOperationsScreen';

const operation = {
  id: '019c8fcb-82a7-7000-9000-000000000001',
  aggregateType: 'Payment',
  aggregateId: '019c8fcb-82a7-7000-9000-000000000002',
  eventType: 'RefundReconciliationRequested',
  status: 'DEAD_LETTER',
  attempts: 10,
  availableAt: '2026-07-23T00:00:00.000Z',
  lastError: 'Gateway timeout',
  createdAt: '2026-07-23T00:00:00.000Z',
  updatedAt: '2026-07-23T00:00:00.000Z',
};

describe('AdminOperationsScreen', () => {
  it('renders failed refund operations and retries after confirmation', async () => {
    const user = userEvent.setup();
    let retried = false;
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    server.use(
      http.get('http://localhost:3002/api/v1/admin/operations', () =>
        HttpResponse.json({
          data: [{ ...operation, status: retried ? 'PENDING' : 'DEAD_LETTER' }],
          nextCursor: null,
        }),
      ),
      http.post(
        `http://localhost:3002/api/v1/admin/operations/${operation.id}/retry`,
        () => {
          retried = true;
          return HttpResponse.json({ ...operation, status: 'PENDING' });
        },
      ),
    );

    render(<AdminOperationsScreen />);
    expect(
      await screen.findByText('RefundReconciliationRequested'),
    ).toBeInTheDocument();
    expect(screen.getByText('Gateway timeout')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Chạy lại' }));
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Chạy lại' })).toBeNull(),
    );
  });

  it('shows a recoverable error state when the operation API fails', async () => {
    server.use(
      http.get('http://localhost:3002/api/v1/admin/operations', () =>
        HttpResponse.json(
          { message: 'Redis queue unavailable' },
          { status: 503 },
        ),
      ),
    );

    render(<AdminOperationsScreen />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Redis queue unavailable',
    );
    expect(screen.getByRole('button', { name: 'Làm mới' })).toBeInTheDocument();
  });

  it('supports status filtering, an empty state, and cursor pagination', async () => {
    const user = userEvent.setup();
    const requested: string[] = [];
    server.use(
      http.get(
        'http://localhost:3002/api/v1/admin/operations',
        ({ request }) => {
          const url = new URL(request.url);
          requested.push(url.search);
          if (url.searchParams.has('cursor')) {
            return HttpResponse.json({
              data: [
                { ...operation, id: '019c8fcb-82a7-7000-9000-000000000003' },
              ],
              nextCursor: null,
            });
          }
          if (url.searchParams.get('status') === 'PENDING') {
            return HttpResponse.json({ data: [], nextCursor: null });
          }
          return HttpResponse.json({
            data: [operation],
            nextCursor: operation.id,
          });
        },
      ),
    );

    render(<AdminOperationsScreen />);
    await screen.findByText('RefundReconciliationRequested');
    await user.click(screen.getByRole('button', { name: 'Xem thêm' }));
    await waitFor(() =>
      expect(screen.getAllByText('RefundReconciliationRequested')).toHaveLength(
        2,
      ),
    );
    await user.click(screen.getByRole('button', { name: 'Đang chờ' }));
    expect(
      await screen.findByText('Không có tác vụ phù hợp'),
    ).toBeInTheDocument();
    expect(requested.some((query) => query.includes('status=PENDING'))).toBe(
      true,
    );
  });

  it('does not retry a dead-letter operation when confirmation is declined', async () => {
    const user = userEvent.setup();
    let retryCount = 0;
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    server.use(
      http.get('http://localhost:3002/api/v1/admin/operations', () =>
        HttpResponse.json({ data: [operation], nextCursor: null }),
      ),
      http.post(
        `http://localhost:3002/api/v1/admin/operations/${operation.id}/retry`,
        () => {
          retryCount += 1;
          return HttpResponse.json(operation);
        },
      ),
    );

    render(<AdminOperationsScreen />);
    await user.click(await screen.findByRole('button', { name: 'Chạy lại' }));
    expect(retryCount).toBe(0);
  });

  it('reports retry failures and can request all operation statuses', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    server.use(
      http.get('http://localhost:3002/api/v1/admin/operations', () =>
        HttpResponse.json({ data: [operation], nextCursor: null }),
      ),
      http.post(
        `http://localhost:3002/api/v1/admin/operations/${operation.id}/retry`,
        () =>
          HttpResponse.json(
            { message: 'Tác vụ đang được worker xử lý' },
            { status: 409 },
          ),
      ),
    );

    render(<AdminOperationsScreen />);
    await user.click(await screen.findByRole('button', { name: 'Chạy lại' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Tác vụ đang được worker xử lý',
    );
    await user.click(screen.getByRole('button', { name: 'Tất cả' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Tất cả' })).toHaveAttribute(
        'aria-pressed',
        'true',
      ),
    );
  });
});
