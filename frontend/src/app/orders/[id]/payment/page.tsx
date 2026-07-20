import { MomoPaymentScreen } from '@/components/orders/MomoPaymentScreen';

export default function OrderPaymentPage({ params }: { params: { id: string } }) {
  return <MomoPaymentScreen orderId={params.id} />;
}
