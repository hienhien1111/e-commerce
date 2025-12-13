import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class GetExchangeRateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destinationCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['forward', 'reverse'])
  direction?: 'forward' | 'reverse';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  balanceCurrency?: string;

  [key: string]: unknown;
}

export class ExchangeRateResponseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  sourceAmount?: number;

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
  @IsString()
  sourceCurrency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  destinationCurrency?: string;

  [key: string]: unknown;
}
