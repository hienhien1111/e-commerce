import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';

class ShippingAddressDto {
  @ApiProperty() fullName!: string;
  @ApiProperty() phone!: string;
  @ApiProperty() addressLine!: string;
  @ApiProperty() ward!: string;
  @ApiProperty() district!: string;
  @ApiProperty() city!: string;
}

class OrderItemSnapshotDto {
  @ApiProperty() name!: string;
  @ApiPropertyOptional({ nullable: true }) sku!: string | null;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
}

class OrderItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() totalPrice!: number;
  @ApiProperty({ type: OrderItemSnapshotDto }) snapshot!: OrderItemSnapshotDto;
}

class OrderCustomerDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) email!: string | null;
  @ApiPropertyOptional({ nullable: true }) firstName!: string | null;
  @ApiPropertyOptional({ nullable: true }) lastName!: string | null;
}

export class OrderDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty({ enum: OrderStatusEnum }) status!: OrderStatusEnum;
  @ApiProperty() subtotal!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ enum: PaymentStatusEnum }) paymentStatus!: PaymentStatusEnum;
  @ApiProperty({ type: ShippingAddressDto })
  shippingAddress!: ShippingAddressDto;
  @ApiPropertyOptional({ nullable: true }) couponId!: string | null;
  @ApiPropertyOptional({ nullable: true }) note!: string | null;
  @ApiProperty({ type: [OrderItemDto] }) items!: OrderItemDto[];
  @ApiPropertyOptional({ type: OrderCustomerDto }) customer?: OrderCustomerDto;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class OrderPageDto {
  @ApiProperty({ type: [OrderDto] }) data!: OrderDto[];
  @ApiPropertyOptional({ nullable: true }) nextCursor!: string | null;
}

export class OrderStatsDto {
  @ApiProperty({
    example: {
      PENDING: 1,
      CONFIRMED: 0,
      PROCESSING: 0,
      SHIPPED: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    },
  })
  counts!: Record<OrderStatusEnum, number>;
  @ApiProperty() totalRevenue!: number;
}
