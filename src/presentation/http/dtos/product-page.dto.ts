import { ApiProperty } from '@nestjs/swagger';
import { ProductDto } from './product.dto';

export class ProductPageDto {
  @ApiProperty({ type: [ProductDto] }) data!: ProductDto[];
  @ApiProperty({ nullable: true }) nextCursor!: string | null;
}
