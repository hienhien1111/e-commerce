import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { AdminShell } from './AdminShell';

let pathname = '/admin/orders';
vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
}));

describe('AdminShell', () => {
  it('exposes active navigation and an accessible mobile drawer control', async () => {
    const user = userEvent.setup();
    render(
      <AdminShell>
        <h1>Danh sách đơn</h1>
      </AdminShell>,
    );

    expect(screen.getByRole('link', { name: /Đơn hàng/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      screen.getByRole('navigation', { name: 'Điều hướng quản trị' }),
    ).toBeInTheDocument();

    const opener = screen.getByRole('button', {
      name: 'Mở menu quản trị',
    });
    expect(opener).toHaveAttribute('aria-expanded', 'false');
    await user.click(opener);
    expect(opener).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('link', { name: /Đơn hàng/ })).toHaveFocus();
    const collapse = screen.getByRole('button', {
      name: 'Thu gọn sidebar',
    });
    const lastLink = screen.getByRole('link', { name: /Swagger API/ });
    lastLink.focus();
    await user.tab();
    expect(collapse).toHaveFocus();
    await user.tab({ shift: true });
    expect(lastLink).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(opener).toHaveAttribute('aria-expanded', 'false');
    expect(opener).toHaveFocus();

    await user.click(collapse);
    expect(
      screen.getByRole('button', { name: 'Mở rộng sidebar' }),
    ).toBeInTheDocument();
  });

  it('marks the exact dashboard route without selecting every admin link', () => {
    pathname = '/admin';
    render(
      <AdminShell>
        <h1>Tổng quan</h1>
      </AdminShell>,
    );
    expect(screen.getByRole('link', { name: /Tổng quan/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('link', { name: /Đơn hàng/ })).not.toHaveAttribute(
      'aria-current',
    );
    pathname = '/admin/orders';
  });
});
