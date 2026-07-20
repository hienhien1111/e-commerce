import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Header } from '@/components/Header';
import { CartProvider } from '@/providers/CartProvider';
import { ToastProvider } from '@/providers/ToastProvider';

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
          <CartProvider>
            <Header />
            {children}
          </CartProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
