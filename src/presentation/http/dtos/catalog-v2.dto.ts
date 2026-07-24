import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  CatalogProductStatuses,
  CatalogVariantStatuses,
} from '@/application/catalog-v2/types/catalog-v2.types';

const MAX_VND_PRICE = 999_999_999_999;
const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const commaSeparated = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    : value;

export class CatalogV2OptionValueRefDto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  optionCode!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  valueCode!: string;
}

export class CatalogV2OptionValueInputDto {
  @IsOptional()
  @IsUUID('all')
  id?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  label!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;
}

export class CatalogV2OptionInputDto {
  @IsOptional()
  @IsUUID('all')
  id?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  code!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogV2OptionValueInputDto)
  values!: CatalogV2OptionValueInputDto[];
}

export class CatalogV2MediaInputDto {
  @IsOptional()
  @IsUUID('all')
  id?: string;

  @IsUrl({ require_tld: false })
  url!: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  publicId!: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}

export class CatalogV2VariantInputDto {
  @IsOptional()
  @IsUUID('all')
  id?: string;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sku!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_VND_PRICE)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(MAX_VND_PRICE)
  comparePrice?: number | null;

  @IsOptional()
  @IsIn(CatalogVariantStatuses)
  status?: (typeof CatalogVariantStatuses)[number];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  optionValueIds?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogV2OptionValueRefDto)
  optionValueRefs?: CatalogV2OptionValueRefDto[];

  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  mediaIds?: string[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  initialStock?: number;
}

export class CreateCatalogProductV2Dto {
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(220)
  slug?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(10000)
  description?: string | null;

  @IsOptional()
  @IsUUID('all')
  categoryId?: string | null;

  @IsOptional()
  @IsIn(CatalogProductStatuses)
  status?: (typeof CatalogProductStatuses)[number];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogV2OptionInputDto)
  options?: CatalogV2OptionInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogV2MediaInputDto)
  media?: CatalogV2MediaInputDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CatalogV2VariantInputDto)
  variants!: CatalogV2VariantInputDto[];
}

export class UpdateCatalogProductV2Dto extends PartialType(
  CreateCatalogProductV2Dto,
) {}

export class QueryCatalogV2Dto {
  @IsOptional()
  @IsUUID('all')
  categoryId?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @Transform(commaSeparated)
  @IsArray()
  @IsUUID('all', { each: true })
  optionValueIds?: string[];

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  inStock?: boolean;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class AdjustInventoryV2Dto {
  @Type(() => Number)
  @IsInt()
  quantityDelta!: number;

  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(64)
  warehouseCode?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  idempotencyKey?: string;
}
