import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const MAX_VND_PRICE = 999_999_999_999;

export class CreateProductVariantDto {
  @ApiPropertyOptional({ nullable: true, example: 'Đen - L' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  label?: string | null;

  @ApiProperty({ example: 'TSHIRT-BLACK-L' })
  @Transform(trimString)
  @IsString()
  @MaxLength(100)
  sku!: string;

  @ApiProperty({ example: 199000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_VND_PRICE)
  price!: number;

  @ApiPropertyOptional({ nullable: true, example: 249000, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_VND_PRICE)
  comparePrice?: number | null;

  @ApiProperty({ example: 10, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  imageId?: string | null;
}
