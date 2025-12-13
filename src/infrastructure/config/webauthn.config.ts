import { registerAs } from '@nestjs/config';
import { IsString, IsInt, Min, Max } from 'class-validator';
import validateConfig from '@/utils/validate-config';
import { WebAuthnConfig } from './webauthn-config.type';

class EnvironmentVariablesValidator {
  @IsString()
  WEBAUTHN_RP_ID: string;

  @IsString()
  WEBAUTHN_RP_NAME: string;

  @IsString()
  WEBAUTHN_ALLOWED_ORIGINS: string;

  @IsInt()
  @Min(30)
  @Max(600)
  WEBAUTHN_CHALLENGE_TTL_SEC: number;
}

export default registerAs<WebAuthnConfig>('webauthn', () => {
  validateConfig(process.env, EnvironmentVariablesValidator);

  return {
    rpId: process.env.WEBAUTHN_RP_ID!,
    rpName: process.env.WEBAUTHN_RP_NAME!,
    allowedOrigins: process.env
      .WEBAUTHN_ALLOWED_ORIGINS!.split(',')
      .map((origin) => origin.trim()),
    challengeTtlSec: parseInt(process.env.WEBAUTHN_CHALLENGE_TTL_SEC!, 10),
  };
});
