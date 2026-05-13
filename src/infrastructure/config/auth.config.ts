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
  const env = validateConfig(process.env, EnvironmentVariablesValidator);

  // ms() accepts any string but typings require the narrow `ms.StringValue`
  // literal. class-validator only checks `IsString`, so we narrow here at
  // the single boundary where validated env meets the typed config surface.
  return {
    expires: env.AUTH_JWT_TOKEN_EXPIRES_IN as ms.StringValue,
    refreshExpires: env.AUTH_REFRESH_TOKEN_EXPIRES_IN as ms.StringValue,
    forgotSecret: env.AUTH_FORGOT_SECRET,
    forgotExpires: env.AUTH_FORGOT_TOKEN_EXPIRES_IN as ms.StringValue,
    confirmEmailSecret: env.AUTH_CONFIRM_EMAIL_SECRET,
    confirmEmailExpires:
      env.AUTH_CONFIRM_EMAIL_TOKEN_EXPIRES_IN as ms.StringValue,
    accessPrivateKey: env.ACCESS_JWT_PRIVATE_KEY,
    accessPublicKey: env.ACCESS_JWT_PUBLIC_KEY,
    refreshPrivateKey: env.REFRESH_JWT_PRIVATE_KEY,
    refreshPublicKey: env.REFRESH_JWT_PUBLIC_KEY,
  };
});
