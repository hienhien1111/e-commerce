export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'COD' | 'MOMO';

export type ShippingAddress = {
  fullName: string;
  phone: string;
  addressLine: string;
  ward: string;
  district: string;
  city: string;
};

export type OrderItem = {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  snapshot: {
    name: string;
    sku: string | null;
    imageUrl: string | null;
    variantLabel: string | null;
  };
};

export type Order = {
  id: string;
  userId: string;
  status: OrderStatus;
  subtotal: number;
  discountAmount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  shippingAddress: ShippingAddress;
  couponId: string | null;
  note: string | null;
  items: OrderItem[];
  customer?: {
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type OrderPage = { data: Order[]; nextCursor: string | null };
export type OrderStats = {
  counts: Record<OrderStatus, number>;
  totalRevenue: number;
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  PROCESSING: 'Đang xử lý',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  CANCELLED: 'Đã hủy',
};

export const statusClass = (status: OrderStatus) =>
  `badge badge-${status.toLowerCase()}`;

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận hàng',
  MOMO: 'Ví MoMo',
};

export const canCustomerCancel = (order: Order) =>
  order.paymentStatus !== 'PAID' &&
  ['PENDING', 'CONFIRMED'].includes(order.status);

export const canAdminCancel = (order: Order) =>
  order.paymentStatus !== 'PAID' &&
  ['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status);

export const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};
