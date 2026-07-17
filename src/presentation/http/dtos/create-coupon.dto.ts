import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { DiscountTypeEnum } from '@/domain/enums/discount-type.enum';

const MAX_VND = 999_999_999_999;

export class CreateCouponDto {
  @ApiProperty({ example: 'SALE10' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  code!: string;

  @ApiProperty({ enum: DiscountTypeEnum })
  @IsEnum(DiscountTypeEnum)
  discountType!: DiscountTypeEnum;

  @ApiProperty({ minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_VND)
  discountValue!: number;

  @ApiPropertyOptional({ nullable: true, minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @ValidateIf((item) => item.maxDiscount !== null)
  @IsInt()
  @Min(1)
  @Max(MAX_VND)
  maxDiscount?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @ValidateIf((item) => item.minOrderAmount !== null)
  @IsInt()
  @Min(0)
  @Max(MAX_VND)
  minOrderAmount?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 1 })
  @Type(() => Number)
  @IsOptional()
  @ValidateIf((item) => item.maxUsage !== null)
  @IsInt()
  @Min(1)
  maxUsage?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @Type(() => Date)
  @IsOptional()
  @ValidateIf((item) => item.expiresAt !== null)
  @IsDate()
  expiresAt?: Date | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
