import { User } from '@/domain/entities/user';

export type LoginResult = {
  refreshToken: string;
  token: string;
  tokenExpires: number;
  user: User;
};
