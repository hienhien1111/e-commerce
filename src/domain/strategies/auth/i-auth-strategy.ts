import { User, UserEssentialProps } from '@/domain/entities/user';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

export interface LoginResult {
  user: User;
  isNewUser: boolean;
}

export interface LoginStrategy<TInput> {
  execute(input: TInput): Promise<LoginResult>;
}

export type EmailPasswordLoginInput = Pick<
  UserEssentialProps,
  'email' | 'password'
>;

export type WebAuthnLoginInput = {
  response: AuthenticationResponseJSON;
  challengeKey: string;
};
