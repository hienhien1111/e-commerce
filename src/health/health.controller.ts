import { AllConfigType } from '@/config/config.type';
import { Environment } from '@/constants/app.constant';
import { Public } from '@/decorators/public.decorator';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckResult,
  HealthCheckService,
  HttpHealthIndicator,
} from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma.health';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private configService: ConfigService<AllConfigType>,
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
    private redisHealth: RedisHealthIndicator,
  ) {}

  @Public()
  @ApiOperation({ summary: 'Liveness + readiness check' })
  @Get()
  @HealthCheck()
  async check(): Promise<HealthCheckResult> {
    const apiPrefix = this.configService.getOrThrow('app.apiPrefix', {
      infer: true,
    });
    const appPort = this.configService.getOrThrow('app.port', {
      infer: true,
    });
    const list = [
      () => this.prismaHealth.pingCheck('database'),
      () => this.redisHealth.pingCheck('redis'),
      ...(this.configService.get('app.nodeEnv', { infer: true }) ===
      Environment.DEVELOPMENT
        ? [
            () =>
              this.http.pingCheck(
                'api-docs',
                `http://localhost:${appPort}/${apiPrefix}/docs`,
              ),
          ]
        : []),
    ];
    return this.health.check(list);
  }

  @Public()
  @ApiOperation({ summary: 'Liveness only (no external dependencies)' })
  @Get('live')
  @HealthCheck()
  async live(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }

  @Public()
  @ApiOperation({ summary: 'Readiness (all dependencies)' })
  @Get('ready')
  @HealthCheck()
  async ready(): Promise<HealthCheckResult> {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database'),
      () => this.redisHealth.pingCheck('redis'),
    ]);
  }
}
