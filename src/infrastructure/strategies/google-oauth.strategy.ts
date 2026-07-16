import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AllConfigType } from '@/config/config.type';
import { GoogleProfile } from '@/application/identity/commands/google-login/google-login.command';

@Injectable()
export class GoogleOauthStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(configService: ConfigService<AllConfigType>) {
    const clientId = configService.get('googleOAuth.clientId', { infer: true });
    const clientSecret = configService.get('googleOAuth.clientSecret', {
      infer: true,
    });
    const callbackUrl = configService.get('googleOAuth.callbackUrl', {
      infer: true,
    });

    super({
      clientID: clientId || 'MISSING_CLIENT_ID',
      clientSecret: clientSecret || 'MISSING_CLIENT_SECRET',
      callbackURL: callbackUrl || 'MISSING_CALLBACK_URL',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const { id, name, emails } = profile;
    const userProfile: GoogleProfile = {
      socialId: id,
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
      email: emails?.[0]?.value || '',
    };
    done(null, userProfile);
  }
}
