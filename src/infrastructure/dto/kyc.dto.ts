import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';

export class SubmitKycDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  kycData?: Record<string, unknown>;

  [key: string]: unknown;
}

export class SubmitKybDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  kybData?: Record<string, unknown>;

  [key: string]: unknown;
}

export class KycStatusResponseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transfiUserId?: string;

  [key: string]: unknown;
}

export class ShareKycDto {
  @ApiProperty()
  @IsString()
  transfiUserId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  token?: string;

  [key: string]: unknown;
}
