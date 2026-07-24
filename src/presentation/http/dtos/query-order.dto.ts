import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { OrderStatusEnum } from '@/domain/enums/order-status.enum';
import { PaymentMethodEnum } from '@/domain/enums/payment-method.enum';
import { PaymentStatusEnum } from '@/domain/enums/payment-status.enum';
import { ReservationStatusEnum } from '@/domain/enums/reservation-status.enum';

const optionalNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === null || value === ''
    ? undefined
    : Number(value);

export class QueryOrderDto {
  @ApiPropertyOptional({ enum: OrderStatusEnum })
  @IsOptional()
  @IsEnum(OrderStatusEnum)
  status?: OrderStatusEnum;
  @ApiPropertyOptional() @IsOptional() @IsUUID() cursor?: string;
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @Transform(optionalNumber)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class QueryAdminOrderDto extends QueryOrderDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() userId?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
  @ApiPropertyOptional({ enum: PaymentMethodEnum })
  @IsOptional()
  @IsEnum(PaymentMethodEnum)
  paymentMethod?: PaymentMethodEnum;
  @ApiPropertyOptional({ enum: PaymentStatusEnum })
  @IsOptional()
  @IsEnum(PaymentStatusEnum)
  paymentStatus?: PaymentStatusEnum;
  @ApiPropertyOptional({ enum: ReservationStatusEnum })
  @IsOptional()
  @IsEnum(ReservationStatusEnum)
  reservationStatus?: ReservationStatusEnum;
  @ApiPropertyOptional() @Type(() => Date) @IsOptional() @IsDate() from?: Date;
  @ApiPropertyOptional() @Type(() => Date) @IsOptional() @IsDate() to?: Date;
}

export class QueryOrderStatsDto {
  @ApiPropertyOptional() @Type(() => Date) @IsOptional() @IsDate() from?: Date;
  @ApiPropertyOptional() @Type(() => Date) @IsOptional() @IsDate() to?: Date;
}
