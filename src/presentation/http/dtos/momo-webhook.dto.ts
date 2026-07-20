import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { MomoWebhookPayload } from '@/application/payment/ports/payment.gateway.port';

export class MomoWebhookDto implements MomoWebhookPayload {
  @IsString() @IsNotEmpty() partnerCode!: string;
  @IsString() @IsNotEmpty() orderId!: string;
  @IsString() @IsNotEmpty() requestId!: string;
  @Type(() => Number) @IsInt() @Min(0) amount!: number;
  @IsString() orderInfo!: string;
  @IsString() orderType!: string;
  @Transform(({ value }) => String(value)) @IsString() transId!: string;
  @Type(() => Number) @IsInt() resultCode!: number;
  @IsString() message!: string;
  @IsString() payType!: string;
  @Type(() => Number) @IsInt() @Min(0) responseTime!: number;
  @IsString() extraData!: string;
  @IsString() @IsNotEmpty() signature!: string;
}
