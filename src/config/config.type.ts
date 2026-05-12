import { AppConfig } from './app-config.type';
import { AuthConfig } from '@/infrastructure/config/auth-config.type';
import { WebAuthnConfig } from '@/infrastructure/config/webauthn-config.type';

export type AllConfigType = {
  app: AppConfig;
  auth: AuthConfig;
  webauthn: WebAuthnConfig;
};
