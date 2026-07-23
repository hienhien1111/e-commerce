import { AdminOrderDetailScreen } from '@/components/orders/AdminOrderDetailScreen';
export default function AdminOrderPage({ params }: { params: { id: string } }) {
  return <AdminOrderDetailScreen orderId={params.id} />;
}
