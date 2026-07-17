import { AppConfig } from './app-config.type';
import { AuthConfig } from '@/infrastructure/config/auth-config.type';
import { WebAuthnConfig } from '@/infrastructure/config/webauthn-config.type';
import { GoogleOAuthConfig } from '@/infrastructure/config/google-oauth-config.type';
import { CloudinaryConfig } from '@/infrastructure/config/cloudinary-config.type';
import { MomoConfig } from '@/infrastructure/config/momo-config.type';
import { ResendConfig } from '@/infrastructure/config/resend-config.type';

export type AllConfigType = {
  app: AppConfig;
  auth: AuthConfig;
  webauthn: WebAuthnConfig;
  googleOAuth: GoogleOAuthConfig;
  cloudinary: CloudinaryConfig;
  momo: MomoConfig;
  resend: ResendConfig;
};
