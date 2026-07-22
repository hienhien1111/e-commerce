import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ minimum: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  quantity!: number;
}
