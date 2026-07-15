import { registerAs } from '@nestjs/config';
import { IsOptional, IsString } from 'class-validator';
import validateConfig from '@/utils/validate-config';
import { GoogleOAuthConfig } from './google-oauth-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  GOOGLE_CLIENT_SECRET: string;

  @IsString()
  @IsOptional()
  GOOGLE_CALLBACK_URL: string;
}

export default registerAs<GoogleOAuthConfig>('googleOAuth', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackUrl: process.env.GOOGLE_CALLBACK_URL,
  };
});
