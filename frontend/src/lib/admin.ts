import type { Category, Product, ProductPage } from '@/lib/catalog';
import type { Order } from '@/lib/order';

export type Coupon = {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  maxDiscount: number | null;
  minOrderAmount: number | null;
  maxUsage: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
};

export type AdminUser = {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  provider: string;
  role: { name: string } | null;
  createdAt: string;
};

export type CursorPage<T> = { data: T[]; nextCursor: string | null };

export type AdminDashboard = {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  revenueToday: number;
  pendingOrders: number;
  reservationFailures: number;
  refundPending: number;
  refundFailed: number;
  recentOrders: Order[];
};

export type AdminProductPage = ProductPage;
export type AdminCategory = Category;

export type CommerceOperationStatus =
  | 'PENDING'
  | 'PUBLISHED'
  | 'PROCESSING'
  | 'PROCESSED'
  | 'DEAD_LETTER';

export type CommerceOperation = {
  id: string;
  aggregateType: string;
  aggregateId: string;
  eventType: string;
  status: CommerceOperationStatus;
  attempts: number;
  availableAt: string;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CommerceOperationPage = CursorPage<CommerceOperation>;
