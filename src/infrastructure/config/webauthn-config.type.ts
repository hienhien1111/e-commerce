export type WebAuthnConfig = {
  rpId: string;
  rpName: string;
  allowedOrigins: string[];
  challengeTtlSec: number;
};
