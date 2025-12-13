import { registerAs } from '@nestjs/config';

import { IsString } from 'class-validator';
import validateConfig from '@/utils/validate-config';
import { AuthConfig } from './auth-config.type';
import ms from 'ms';

class EnvironmentVariablesValidator {
  @IsString()
  AUTH_JWT_TOKEN_EXPIRES_IN: string;

  @IsString()
  AUTH_REFRESH_TOKEN_EXPIRES_IN: string;

  @IsString()
  AUTH_FORGOT_SECRET: string;

  @IsString()
  AUTH_FORGOT_TOKEN_EXPIRES_IN: string;

  @IsString()
  AUTH_CONFIRM_EMAIL_SECRET: string;

  @IsString()
  AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN: string;

  // Require RSA key pairs provided as PEM in env
  @IsString()
  ACCESS_JWT_PRIVATE_KEY: string;

  @IsString()
  ACCESS_JWT_PUBLIC_KEY: string;

  @IsString()
  REFRESH_JWT_PRIVATE_KEY: string;

  @IsString()
  REFRESH_JWT_PUBLIC_KEY: string;
}

export default registerAs<AuthConfig>('auth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    expires: process.env.AUTH_JWT_TOKEN_EXPIRES_IN as ms.StringValue,
    refreshExpires: process.env.AUTH_REFRESH_TOKEN_EXPIRES_IN as ms.StringValue,
    forgotSecret: process.env.AUTH_FORGOT_SECRET,
    forgotExpires: process.env.AUTH_FORGOT_TOKEN_EXPIRES_IN as ms.StringValue,
    confirmEmailSecret: process.env.AUTH_CONFIRM_EMAIL_SECRET,
    confirmEmailExpires: process.env
      .AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN as ms.StringValue,
    accessPrivateKey: process.env.ACCESS_JWT_PRIVATE_KEY,
    accessPublicKey: process.env.ACCESS_JWT_PUBLIC_KEY,
    refreshPrivateKey: process.env.REFRESH_JWT_PRIVATE_KEY,
    refreshPublicKey: process.env.REFRESH_JWT_PUBLIC_KEY,
  };
});
