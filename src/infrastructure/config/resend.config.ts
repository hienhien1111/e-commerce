import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '@/utils/validate-config';
import { ResendConfig } from './resend-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  RESEND_API_KEY: string;

  @IsString()
  @IsOptional()
  RESEND_FROM: string;
}

export default registerAs<ResendConfig>('resend', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  const isProduction = process.env.NODE_ENV === 'production';
  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM ??
    (isProduction ? undefined : 'Shop <onboarding@resend.dev>');

  if (isProduction && (!apiKey || !from)) {
    throw new Error(
      'RESEND_API_KEY and RESEND_FROM from a verified Resend domain are required in production',
    );
  }

  return {
    apiKey,
    from,
  };
});
