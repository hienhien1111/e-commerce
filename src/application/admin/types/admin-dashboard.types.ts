import type { Order } from '@/domain/entities/order';

export type AdminDashboardStats = {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  revenueToday: number;
  pendingOrders: number;
  recentOrders: Order[];
};
