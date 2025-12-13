import { Session } from '@/domain/entities/session';
import { User } from '@/domain/entities/user';

export type AccessTokenData = {
  token: string;
  tokenExpires: number;
};

export type RefreshTokenData = {
  refreshToken: string;
};

type SignAccessTokenPayload = Pick<User, 'id' | 'role'> & {
  sessionId: Session['id'];
};

type SignRefreshTokenPayload = {
  sessionId: Session['id'];
  hash: Session['hash'];
};

export interface TokenPort {
  signAccessToken(payload: SignAccessTokenPayload): Promise<AccessTokenData>;

  signRefreshToken(payload: SignRefreshTokenPayload): Promise<RefreshTokenData>;
}
