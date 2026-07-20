import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AllConfigType } from '@/config/config.type';

export type AuthEmailAction =
  | 'verify-email'
  | 'verify-new-email'
  | 'reset-password';

type AuthEmailTokenPayload = {
  sub: string;
  action: AuthEmailAction;
  newEmail?: string;
};

@Injectable()
export class AuthEmailTokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  createVerificationToken(userId: string): Promise<string> {
    return this.sign({ sub: userId, action: 'verify-email' }, 'confirm');
  }

  createNewEmailToken(userId: string, newEmail: string): Promise<string> {
    return this.sign(
      { sub: userId, action: 'verify-new-email', newEmail },
      'confirm',
    );
  }

  createPasswordResetToken(userId: string): Promise<string> {
    return this.sign({ sub: userId, action: 'reset-password' }, 'forgot');
  }

  async verify(
    token: string,
    expectedAction: AuthEmailAction,
  ): Promise<AuthEmailTokenPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<AuthEmailTokenPayload>(
        token,
        this.getJwtOptions(expectedAction),
      );
      if (payload.action !== expectedAction || !payload.sub) {
        throw new Error('Unexpected action');
      }
      return payload;
    } catch {
      throw new UnprocessableEntityException({
        errors: { hash: 'invalidHash' },
      });
    }
  }

  private sign(
    payload: AuthEmailTokenPayload,
    family: 'confirm' | 'forgot',
  ): Promise<string> {
    return this.jwtService.signAsync(
      payload,
      this.getJwtOptionsForFamily(family),
    );
  }

  private getJwtOptions(action: AuthEmailAction) {
    return this.getJwtOptionsForFamily(
      action === 'reset-password' ? 'forgot' : 'confirm',
    );
  }

  private getJwtOptionsForFamily(family: 'confirm' | 'forgot') {
    if (family === 'confirm') {
      return {
        secret: this.configService.getOrThrow('auth.confirmEmailSecret', {
          infer: true,
        }),
        expiresIn: this.configService.getOrThrow('auth.confirmEmailExpires', {
          infer: true,
        }),
      };
    }

    return {
      secret: this.configService.getOrThrow('auth.forgotSecret', {
        infer: true,
      }),
      expiresIn: this.configService.getOrThrow('auth.forgotExpires', {
        infer: true,
      }),
    };
  }
}
