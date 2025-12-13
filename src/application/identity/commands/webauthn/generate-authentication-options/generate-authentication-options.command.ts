export class GenerateAuthenticationOptionsCommand {
  constructor(
    public readonly userId?: string, // Optional for usernameless flow
    public readonly userEmail?: string, // Alternative identifier
  ) {}
}
