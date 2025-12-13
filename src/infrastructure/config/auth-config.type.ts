import ms from 'ms';

export type AuthConfig = {
  expires?: ms.StringValue;
  refreshExpires?: ms.StringValue;
  forgotSecret?: string;
  forgotExpires?: ms.StringValue;
  confirmEmailSecret?: string;
  confirmEmailExpires?: ms.StringValue;
  accessPrivateKey?: string;
  accessPublicKey?: string;
  refreshPrivateKey?: string;
  refreshPublicKey?: string;
};
