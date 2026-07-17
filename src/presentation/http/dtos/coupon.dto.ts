import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';

export class CouponDto {
  @ApiProperty() id!: string;
  @ApiProperty() code!: string;
  @ApiProperty({ enum: DiscountTypeEnum }) discountType!: DiscountTypeEnum;
  @ApiProperty() discountValue!: number;
  @ApiPropertyOptional({ nullable: true }) maxDiscount!: number | null;
  @ApiPropertyOptional({ nullable: true }) minOrderAmount!: number | null;
  @ApiPropertyOptional({ nullable: true }) maxUsage!: number | null;
  @ApiProperty() usedCount!: number;
  @ApiPropertyOptional({ nullable: true }) expiresAt!: Date | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
