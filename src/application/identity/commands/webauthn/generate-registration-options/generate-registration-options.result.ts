import type { PublicKeyCredentialCreationOptionsJSON } from '@simplewebauthn/types';

export type GenerateRegistrationOptionsResult = {
  options: PublicKeyCredentialCreationOptionsJSON;
  challengeKey: string;
};
