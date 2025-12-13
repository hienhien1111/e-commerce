import { Injectable } from '@nestjs/common';
import {
  ChallengeStorePort,
  ChallengeData,
} from '@/application/identity/ports/webauthn/challenge-store.port';

@Injectable()
export class InMemoryChallengeStore implements ChallengeStorePort {
  private readonly challengeMap = new Map<string, ChallengeData>();

  async store(key: string, data: ChallengeData): Promise<void> {
    this.challengeMap.set(key, data);

    // Auto-cleanup expired challenges
    setTimeout(() => {
      this.remove(key);
    }, data.expiresAt.getTime() - Date.now());
  }

  async retrieve(key: string): Promise<ChallengeData | null> {
    const data = this.challengeMap.get(key);

    if (!data) {
      return null;
    }

    // Check if expired
    if (data.expiresAt.getTime() < Date.now()) {
      this.challengeMap.delete(key);
      return null;
    }

    return data;
  }

  async remove(key: string): Promise<void> {
    this.challengeMap.delete(key);
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, data] of this.challengeMap.entries()) {
      if (data.expiresAt.getTime() < now) {
        this.challengeMap.delete(key);
      }
    }
  }
}
