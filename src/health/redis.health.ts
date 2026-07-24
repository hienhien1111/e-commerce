import { Injectable, OnModuleDestroy } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { Redis } from 'ioredis';

@Injectable()
export class RedisHealthIndicator
  extends HealthIndicator
  implements OnModuleDestroy
{
  private redis: Redis | null = null;

  private getClient(): Redis | null {
    if (!process.env.REDIS_URL) return null;
    if (!this.redis) {
      this.redis = new Redis(process.env.REDIS_URL, {
        maxRetriesPerRequest: 1,
        lazyConnect: true,
      });
    }
    return this.redis;
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    const client = this.getClient();
    if (!client) {
      throw new HealthCheckError(
        `${key} is not configured`,
        this.getStatus(key, false, { configured: false }),
      );
    }
    try {
      const pong = await client.ping();
      return this.getStatus(key, pong === 'PONG', { configured: true });
    } catch (err) {
      throw new HealthCheckError(
        `${key} ping failed`,
        this.getStatus(key, false, {
          message: err instanceof Error ? err.message : 'unknown',
        }),
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
