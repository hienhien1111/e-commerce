import { registerAs } from '@nestjs/config';
import { IsBoolean, IsOptional, IsString, IsUrl } from 'class-validator';
import validateConfig from '@/utils/validate-config';
import type { AlpacaConfig } from './alpaca-config.type';

class EnvironmentVariablesValidator {
  @IsUrl({ require_tld: false })
  @IsOptional()
  ALPACA_BASE_URL: string;

  @IsBoolean()
  @IsOptional()
  ALPACA_IS_PAPER: boolean;

  @IsString()
  @IsOptional()
  ALPACA_CLIENT_ID: string;

  @IsString()
  @IsOptional()
  ALPACA_CLIENT_SECRET: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  ALPACA_REDIRECT_URI: string;

  @IsString()
  @IsOptional()
  ALPACA_WS_API_KEY: string;

  @IsString()
  @IsOptional()
  ALPACA_WS_API_SECRET: string;
}

export default registerAs<AlpacaConfig>('alpaca', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    baseUrl: process.env.ALPACA_BASE_URL,
    isPaper: process.env.ALPACA_IS_PAPER === 'true',
    clientId: process.env.ALPACA_CLIENT_ID,
    clientSecret: process.env.ALPACA_CLIENT_SECRET,
    redirectUri: process.env.ALPACA_REDIRECT_URI,
    wsApiKey: process.env.ALPACA_WS_API_KEY,
    wsApiSecret: process.env.ALPACA_WS_API_SECRET,
  };
});
