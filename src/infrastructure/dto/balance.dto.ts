import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional } from 'class-validator';

export class GetBalanceResponseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  balance?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currency?: string;

  [key: string]: unknown;
}

export class CreateCryptoPrefundDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  [key: string]: unknown;
}

export class CreateFiatPrefundDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  [key: string]: unknown;
}

export class PrefundResponseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  prefundId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  [key: string]: unknown;
}

export class CreateSandboxPrefundDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiProperty()
  @IsString()
  currency: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  [key: string]: unknown;
}
