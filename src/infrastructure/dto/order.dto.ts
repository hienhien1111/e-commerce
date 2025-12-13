import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsUrl } from 'class-validator';

export class CreatePayinOrderDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiProperty()
  @IsString()
  externalOrderId: string;

  @ApiProperty()
  @IsString()
  sourceCurrency: string;

  @ApiProperty()
  @IsString()
  destinationCurrency: string;

  @ApiProperty()
  @IsNumber()
  sourceAmount: number;

  @ApiProperty()
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class CreatePayinWithWalletDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiProperty()
  @IsString()
  externalOrderId: string;

  @ApiProperty()
  @IsString()
  sourceCurrency: string;

  @ApiProperty()
  @IsString()
  destinationCurrency: string;

  @ApiProperty()
  @IsNumber()
  sourceAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class CreatePayoutOrderDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiProperty()
  @IsString()
  externalOrderId: string;

  @ApiProperty()
  @IsString()
  sourceCurrency: string;

  @ApiProperty()
  @IsString()
  destinationCurrency: string;

  @ApiProperty()
  @IsNumber()
  sourceAmount: number;

  @ApiProperty()
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class CreateCryptoPayinOrderDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiProperty()
  @IsString()
  externalOrderId: string;

  @ApiProperty()
  @IsString()
  sourceCurrency: string;

  @ApiProperty()
  @IsString()
  destinationCurrency: string;

  @ApiProperty()
  @IsNumber()
  sourceAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class CreateCryptoPayoutOrderDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiProperty()
  @IsString()
  externalOrderId: string;

  @ApiProperty()
  @IsString()
  sourceCurrency: string;

  @ApiProperty()
  @IsString()
  destinationCurrency: string;

  @ApiProperty()
  @IsNumber()
  sourceAmount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}

export class OrderResponseDto {
  @ApiProperty()
  @IsString()
  orderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalOrderId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  destinationAmount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  fee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  paymentUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionHash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  completedAt?: string;

  [key: string]: unknown;
}

export class ListOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  orders: OrderResponseDto[];

  @ApiPropertyOptional()
  total?: number;

  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  [key: string]: unknown;
}
