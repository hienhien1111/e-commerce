import type { AdminDashboardStats } from '@/application/admin/types/admin-dashboard.types';

export interface AdminDashboardRepositoryPort {
  getDashboardStats(): Promise<AdminDashboardStats>;
}
