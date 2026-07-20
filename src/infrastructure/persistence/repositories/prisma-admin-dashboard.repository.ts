import { Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import type { AdminDashboardRepositoryPort } from '@/application/admin/ports/admin-dashboard.repository.port';
import type { AdminDashboardStats } from '@/application/admin/types/admin-dashboard.types';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  OrderMapper,
  PrismaOrderWithRelations,
} from '@/infrastructure/persistence/mappers/order.mapper';

const RECENT_ORDER_INCLUDE = {
  items: { orderBy: { id: 'asc' } },
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
} as const satisfies Prisma.OrderInclude;

const hcmDayBounds = (now = new Date()): { start: Date; end: Date } => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((item) => item.type === type)?.value);
  const start = new Date(
    Date.UTC(part('year'), part('month') - 1, part('day')) - 7 * 60 * 60 * 1000,
  );
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
};

@Injectable()
export class PrismaAdminDashboardRepository
  implements AdminDashboardRepositoryPort
{
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const { start, end } = hcmDayBounds();
    const activeRevenue = {
      deletedAt: null,
      status: { not: OrderStatusEnum.CANCELLED },
    } as const;
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      revenue,
      todayRevenue,
      pendingOrders,
      recentOrders,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.product.count({ where: { deletedAt: null } }),
      this.prisma.order.count({ where: { deletedAt: null } }),
      this.prisma.order.aggregate({
        where: activeRevenue,
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: { ...activeRevenue, createdAt: { gte: start, lt: end } },
        _sum: { total: true },
      }),
      this.prisma.order.count({
        where: { deletedAt: null, status: OrderStatusEnum.PENDING },
      }),
      this.prisma.order.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: RECENT_ORDER_INCLUDE,
      }),
    ]);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue: revenue._sum.total?.toNumber() ?? 0,
      revenueToday: todayRevenue._sum.total?.toNumber() ?? 0,
      pendingOrders,
      recentOrders: recentOrders.map((row) =>
        OrderMapper.toDomain(row as PrismaOrderWithRelations),
      ),
    };
  }
}
