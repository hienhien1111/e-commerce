import { ApiProperty } from '@nestjs/swagger';
import { OrderDto } from '@/presentation/http/dtos/order.dto';

export class AdminDashboardDto {
  @ApiProperty()
  totalUsers!: number;

  @ApiProperty()
  totalProducts!: number;

  @ApiProperty()
  totalOrders!: number;

  @ApiProperty()
  totalRevenue!: number;

  @ApiProperty()
  revenueToday!: number;

  @ApiProperty()
  pendingOrders!: number;

  @ApiProperty()
  reservationFailures!: number;

  @ApiProperty()
  refundPending!: number;

  @ApiProperty()
  refundFailed!: number;

  @ApiProperty({ type: [OrderDto] })
  recentOrders!: OrderDto[];
}
