import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Payment } from '@/domain/entities/payment';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';

export class PaymentDto {
  @ApiProperty() id!: string;
  @ApiProperty() orderId!: string;
  @ApiProperty() provider!: string;
  @ApiProperty() amount!: number;
  @ApiProperty({ enum: PaymentStatusEnum }) status!: PaymentStatusEnum;
  @ApiPropertyOptional({ nullable: true }) payUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) qrCodeUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) deeplink!: string | null;
  @ApiPropertyOptional({ nullable: true }) expiresAt!: Date | null;
  @ApiPropertyOptional({ nullable: true }) paidAt!: Date | null;

  static from(payment: Payment): PaymentDto {
    return {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      amount: payment.amount,
      status: payment.status,
      payUrl: payment.payUrl,
      qrCodeUrl: payment.qrCodeUrl,
      deeplink: payment.deeplink,
      expiresAt: payment.expiresAt,
      paidAt: payment.paidAt,
    };
  }
}
