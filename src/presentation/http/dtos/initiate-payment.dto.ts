import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class InitiatePaymentDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  orderId!: string;
}
