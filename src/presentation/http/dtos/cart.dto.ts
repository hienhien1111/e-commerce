import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CartProductDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiProperty() price!: number;
  @ApiProperty() stock!: number;
  @ApiPropertyOptional({ nullable: true }) label!: string | null;
  @ApiProperty() sku!: string;
  @ApiPropertyOptional({ nullable: true }) thumbnailUrl!: string | null;
  @ApiProperty() isAvailable!: boolean;
  @ApiPropertyOptional({ nullable: true })
  availabilityReason!: string | null;
}

class CartItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() productId!: string;
  @ApiProperty() variantId!: string;
  @ApiProperty() quantity!: number;
  @ApiProperty({ type: CartProductDto })
  product!: CartProductDto;
  @ApiProperty() isAvailable!: boolean;
  @ApiPropertyOptional({ nullable: true })
  availabilityReason!: string | null;
}

class CartCouponDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty() isValid!: boolean;
  @ApiPropertyOptional() reason?: string;
  @ApiProperty() discountAmount!: number;
}

export class CartDto {
  @ApiPropertyOptional({ nullable: true }) id!: string | null;
  @ApiProperty({ type: [CartItemDto] })
  items!: CartItemDto[];
  @ApiProperty() itemCount!: number;
  @ApiProperty() subtotal!: number;
  @ApiProperty() discountAmount!: number;
  @ApiProperty() total!: number;
  @ApiProperty() checkoutReady!: boolean;
  @ApiPropertyOptional({
    type: CartCouponDto,
    nullable: true,
  })
  coupon!: CartCouponDto | null;
}
