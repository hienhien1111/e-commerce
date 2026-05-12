import { AppConfig } from './app-config.type';
import { AuthConfig } from '@/infrastructure/config/auth-config.type';
import { DatabaseConfig } from '@/database/config/database-config.type';
import { WebAuthnConfig } from '@/infrastructure/config/webauthn-config.type';

export type AllConfigType = {
  app: AppConfig;
  auth: AuthConfig;
  database: DatabaseConfig;
  webauthn: WebAuthnConfig;
};
