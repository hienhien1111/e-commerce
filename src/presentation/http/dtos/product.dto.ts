import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductImageDto } from './product-image.dto';

export class ProductDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() slug!: string;
  @ApiPropertyOptional({ nullable: true }) description!: string | null;
  @ApiProperty({ example: 199000 }) price!: number;
  @ApiPropertyOptional({ nullable: true, example: 249000 }) comparePrice!:
    | number
    | null;
  @ApiProperty() stock!: number;
  @ApiPropertyOptional({ nullable: true }) sku!: string | null;
  @ApiPropertyOptional({ nullable: true }) categoryId!: string | null;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ type: [ProductImageDto] }) images!: ProductImageDto[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
