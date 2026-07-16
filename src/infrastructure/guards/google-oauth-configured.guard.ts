import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';

@Injectable()
export class GoogleOAuthConfiguredGuard implements CanActivate {
  constructor(private readonly configService: ConfigService<AllConfigType>) {}

  canActivate(_context: ExecutionContext): boolean {
    const clientId = this.configService.get('googleOAuth.clientId', {
      infer: true,
    });
    const clientSecret = this.configService.get('googleOAuth.clientSecret', {
      infer: true,
    });
    const callbackUrl = this.configService.get('googleOAuth.callbackUrl', {
      infer: true,
    });

    if (clientId && clientSecret && callbackUrl) {
      return true;
    }

    throw new ServiceUnavailableException({
      statusCode: 503,
      message: 'Google OAuth is not configured',
      error: 'Service Unavailable',
    });
  }
}
