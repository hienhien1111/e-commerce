export type GetUserCredentialsResult = Array<{
  id: string;
  credentialId: string;
  deviceType: string | null | undefined;
  backedUp: boolean;
  transports: string[] | null | undefined;
  createdAt: Date;
  lastUsedAt: Date | null | undefined;
}>;
