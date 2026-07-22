import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductVariantDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) label!: string | null;
  @ApiProperty() sku!: string;
  @ApiProperty() price!: number;
  @ApiPropertyOptional({ nullable: true }) comparePrice!: number | null;
  @ApiProperty() stock!: number;
  @ApiProperty() isActive!: boolean;
  @ApiPropertyOptional({ nullable: true }) imageId!: string | null;
  @ApiPropertyOptional({ nullable: true }) imageUrl!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
