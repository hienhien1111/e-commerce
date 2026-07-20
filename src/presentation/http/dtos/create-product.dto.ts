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
  MinLength,
} from 'class-validator';

const MAX_VND_PRICE = 999_999_999_999;
const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProductDto {
  @ApiProperty({ example: 'Tai nghe không dây' })
  @Transform(trimString)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(10000)
  description?: string | null;

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

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ nullable: true, example: 'TWS-BLACK-01' })
  @Transform(trimString)
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
