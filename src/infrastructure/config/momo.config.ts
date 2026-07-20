import { registerAs } from '@nestjs/config';
import { IsInt, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import validateConfig from '@/utils/validate-config';
import { MomoConfig } from './momo-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  MOMO_PARTNER_CODE: string;

  @IsString()
  @IsOptional()
  MOMO_ACCESS_KEY: string;

  @IsString()
  @IsOptional()
  MOMO_SECRET_KEY: string;

  @IsString()
  @IsOptional()
  MOMO_ENDPOINT: string;

  @IsString()
  @IsOptional()
  MOMO_IPN_URL: string;

  @IsString()
  @IsOptional()
  MOMO_REDIRECT_URL: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @IsOptional()
  MOMO_PAYMENT_EXPIRY_MINUTES: number;
}

export default registerAs<MomoConfig>('momo', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return {
    partnerCode: process.env.MOMO_PARTNER_CODE,
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    endpoint: process.env.MOMO_ENDPOINT ?? 'https://test-payment.momo.vn',
    ipnUrl: process.env.MOMO_IPN_URL,
    redirectUrl: process.env.MOMO_REDIRECT_URL,
    paymentExpiryMinutes: Number(process.env.MOMO_PAYMENT_EXPIRY_MINUTES ?? 15),
  };
});
