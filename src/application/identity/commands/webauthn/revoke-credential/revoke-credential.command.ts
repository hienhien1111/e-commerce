export class RevokeCredentialCommand {
  constructor(
    public readonly credentialId: string,
    public readonly userId: string, // For authorization
  ) {}
}
