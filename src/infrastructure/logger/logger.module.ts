import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import type { IncomingMessage } from 'http';
import type { AllConfigType } from '@/config/config.type';

const REQUEST_ID_HEADER = 'x-request-id';

@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AllConfigType>) => {
        const nodeEnv = configService.get('app.nodeEnv', { infer: true });
        const isProd = nodeEnv === 'production';

        return {
          pinoHttp: {
            level: isProd ? 'info' : 'debug',
            genReqId: (req: IncomingMessage) => {
              const incoming = req.headers[REQUEST_ID_HEADER];
              if (typeof incoming === 'string' && incoming.length > 0) {
                return incoming;
              }
              return randomUUID();
            },
            customProps: () => ({
              service: 'nest-clean-arch-boilerplate',
            }),
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.cookie',
                'req.body.password',
                'req.body.token',
                'req.body.refreshToken',
                'res.headers["set-cookie"]',
              ],
              censor: '[REDACTED]',
            },
            transport: isProd
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'SYS:HH:MM:ss.l',
                    ignore: 'pid,hostname,service',
                  },
                },
            serializers: {
              req(req) {
                return {
                  id: req.id,
                  method: req.method,
                  url: req.url,
                };
              },
              res(res) {
                return {
                  statusCode: res.statusCode,
                };
              },
            },
            customLogLevel: (_req, res, err) => {
              if (res.statusCode >= 500 || err) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
          },
        };
      },
    }),
  ],
})
export class LoggerModule {}
