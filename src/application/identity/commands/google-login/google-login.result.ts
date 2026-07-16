import { User } from '@/domain/entities/user';

export interface GoogleLoginResult {
  refreshToken: string;
  token: string;
  tokenExpires: number;
  user: User;
}
