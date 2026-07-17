import { ProductDetail } from '@/components/catalog/ProductDetail';

export default function ProductPage({ params }: { params: { id: string } }) {
  return <ProductDetail productId={params.id} />;
}
