export interface ChallengeData {
  challenge: string;
  userId?: string;
  purpose: 'registration' | 'authentication';
  expiresAt: Date;
}

export interface ChallengeStorePort {
  store(key: string, data: ChallengeData): Promise<void>;

  retrieve(key: string): Promise<ChallengeData | null>;

  remove(key: string): Promise<void>;

  cleanup(): Promise<void>;
}
