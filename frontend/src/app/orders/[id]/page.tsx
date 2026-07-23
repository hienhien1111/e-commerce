import { OrderDetailScreen } from '@/components/orders/OrderDetailScreen';
export default function OrderPage({ params }: { params: { id: string } }) {
  return <OrderDetailScreen orderId={params.id} />;
}
