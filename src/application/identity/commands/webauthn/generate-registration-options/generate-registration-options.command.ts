export class GenerateRegistrationOptionsCommand {
  constructor(
    public readonly userId: string,
    public readonly userDisplayName: string,
    public readonly userEmail: string,
  ) {}
}
