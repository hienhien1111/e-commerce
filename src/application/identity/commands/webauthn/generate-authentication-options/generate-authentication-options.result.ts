import type { PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/types';

export type GenerateAuthenticationOptionsResult = {
  options: PublicKeyCredentialRequestOptionsJSON;
  challengeKey: string;
};
