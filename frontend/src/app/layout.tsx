import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Header } from '@/components/Header';
import { CartProvider } from '@/providers/CartProvider';
import { ToastProvider } from '@/providers/ToastProvider';
import { SessionProvider } from '@/providers/SessionProvider';

export const metadata: Metadata = {
  title: {
    default: 'ShopApp — Mua sắm tiện lợi',
    template: '%s | ShopApp',
  },
  description: 'Nền tảng mua sắm trực tuyến với hàng nghìn sản phẩm chất lượng',
  keywords: ['mua sắm', 'ecommerce', 'shop', 'online'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>
        <ToastProvider>
          <SessionProvider>
            <CartProvider>
              <Header />
              {children}
            </CartProvider>
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
