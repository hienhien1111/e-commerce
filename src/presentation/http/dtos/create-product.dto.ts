import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CreateProductVariantDto } from './create-product-variant.dto';

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

  @ApiPropertyOptional({
    type: () => CreateProductVariantDto,
    isArray: true,
    description:
      'Create all sellable variants atomically with the product. Leave empty for one default variant.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}
