import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CouponValidationDto {
  @ApiProperty() valid!: boolean;
  @ApiProperty() discountAmount!: number;
  @ApiPropertyOptional() reason?: string;
}
