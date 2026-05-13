import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import {
  ChallengeStorePort,
  ChallengeData,
} from '@/application/identity/ports/webauthn/challenge-store.port';

const KEY_PREFIX = 'webauthn:challenge:';

interface SerializedChallengeData {
  challenge: string;
  userId?: string;
  purpose: 'registration' | 'authentication';
  expiresAt: string;
}

@Injectable()
export class RedisChallengeStore
  implements ChallengeStorePort, OnModuleDestroy
{
  private readonly redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL as string, {
      maxRetriesPerRequest: 3,
      lazyConnect: false,
    });
  }

  async store(key: string, data: ChallengeData): Promise<void> {
    const serialized: SerializedChallengeData = {
      challenge: data.challenge,
      userId: data.userId,
      purpose: data.purpose,
      expiresAt: data.expiresAt.toISOString(),
    };

    const ttlMs = data.expiresAt.getTime() - Date.now();
    if (ttlMs <= 0) {
      // Already expired — do not store
      return;
    }

    await this.redis.set(
      KEY_PREFIX + key,
      JSON.stringify(serialized),
      'PX',
      ttlMs,
    );
  }

  async retrieve(key: string): Promise<ChallengeData | null> {
    const raw = await this.redis.get(KEY_PREFIX + key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as SerializedChallengeData;
    const expiresAt = new Date(parsed.expiresAt);

    // Redis TTL would have evicted, but double-check for clock skew
    if (expiresAt.getTime() < Date.now()) {
      await this.redis.del(KEY_PREFIX + key);
      return null;
    }

    return {
      challenge: parsed.challenge,
      userId: parsed.userId,
      purpose: parsed.purpose,
      expiresAt,
    };
  }

  async remove(key: string): Promise<void> {
    await this.redis.del(KEY_PREFIX + key);
  }

  async cleanup(): Promise<void> {
    // No-op: Redis TTL handles expiry automatically. Method exists to
    // satisfy the port contract.
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
