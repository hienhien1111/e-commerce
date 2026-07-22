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

const optionalTrimmed = (value: string | undefined): string | undefined => {
  const trimmed = value?.trim();
  return trimmed || undefined;
};

export default registerAs<MomoConfig>('momo', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return {
    partnerCode: optionalTrimmed(process.env.MOMO_PARTNER_CODE),
    accessKey: optionalTrimmed(process.env.MOMO_ACCESS_KEY),
    secretKey: optionalTrimmed(process.env.MOMO_SECRET_KEY),
    endpoint:
      optionalTrimmed(process.env.MOMO_ENDPOINT) ??
      'https://test-payment.momo.vn',
    ipnUrl: optionalTrimmed(process.env.MOMO_IPN_URL),
    redirectUrl: optionalTrimmed(process.env.MOMO_REDIRECT_URL),
    paymentExpiryMinutes: Number(process.env.MOMO_PAYMENT_EXPIRY_MINUTES ?? 15),
  };
});
