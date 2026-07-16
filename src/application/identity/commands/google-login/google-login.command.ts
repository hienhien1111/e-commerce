export interface GoogleProfile {
  email: string;
  firstName: string;
  lastName: string;
  socialId: string;
}

export class GoogleLoginCommand {
  constructor(public readonly profile: GoogleProfile) {}
}
