import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 422 })
  statusCode!: number;

  @ApiProperty({ example: 'RESERVATION_FAILED' })
  code!: string;

  @ApiProperty({ example: 'Không thể giữ tồn kho cho đơn hàng.' })
  message!: string;

  @ApiProperty({ example: false })
  retryable!: boolean;

  @ApiPropertyOptional({
    example: {
      orderId: '019c8fcb-82a7-7000-9000-000000000001',
      reason: 'INSUFFICIENT_STOCK',
    },
  })
  details?: Record<string, unknown>;
}
