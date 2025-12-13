import { AppConfig } from './app-config.type';
import { AuthConfig } from '@/infrastructure/config/auth-config.type';
import { DatabaseConfig } from '@/database/config/database-config.type';
import { WebAuthnConfig } from '@/infrastructure/config/webauthn-config.type';
import type { AlpacaConfig } from '@/infrastructure/config/alpaca-config.type';

export type AllConfigType = {
  app: AppConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  webauthn: WebAuthnConfig;
  alpaca: AlpacaConfig;
};
