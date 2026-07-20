import { CatalogBrowser } from '@/components/catalog/CatalogBrowser';
import { Suspense } from 'react';

export default function HomePage() {
  return (
    <Suspense fallback={<main className="container">Đang tải catalog…</main>}>
      <CatalogBrowser />
    </Suspense>
  );
}
