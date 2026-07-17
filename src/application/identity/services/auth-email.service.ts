import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AllConfigType } from '@/config/config.type';
import type { EmailPort } from '@/application/identity/ports/email/email.port';
import { EMAIL_PORT } from '@/application/identity/ports/email/email.port.token';
import { AuthEmailTokenService } from './auth-email-token.service';

@Injectable()
export class AuthEmailService {
  constructor(
    @Inject(EMAIL_PORT) private readonly emailPort: EmailPort,
    private readonly tokenService: AuthEmailTokenService,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  async sendVerification(userId: string, email: string): Promise<void> {
    const token = await this.tokenService.createVerificationToken(userId);
    const url = this.frontendUrl('/verify-email', token);
    await this.emailPort.send({
      to: email,
      subject: 'Xác nhận địa chỉ email của bạn',
      text: `Xác nhận email: ${url}`,
      html: `<p>Nhấn <a href="${url}">xác nhận email</a> để kích hoạt tài khoản.</p>`,
    });
  }

  async sendPasswordReset(userId: string, email: string): Promise<void> {
    const token = await this.tokenService.createPasswordResetToken(userId);
    const url = this.frontendUrl('/reset-password', token);
    await this.emailPort.send({
      to: email,
      subject: 'Đặt lại mật khẩu',
      text: `Đặt lại mật khẩu: ${url}`,
      html: `<p>Nhấn <a href="${url}">đặt lại mật khẩu</a>. Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>`,
    });
  }

  async sendNewEmailConfirmation(
    userId: string,
    newEmail: string,
  ): Promise<void> {
    const token = await this.tokenService.createNewEmailToken(userId, newEmail);
    const url = this.frontendUrl('/verify-email', token, 'new-email');
    await this.emailPort.send({
      to: newEmail,
      subject: 'Xác nhận địa chỉ email mới',
      text: `Xác nhận email mới: ${url}`,
      html: `<p>Nhấn <a href="${url}">xác nhận email mới</a> để hoàn tất thay đổi.</p>`,
    });
  }

  private frontendUrl(path: string, token: string, mode?: string): string {
    const frontendDomain = this.configService.getOrThrow('app.frontendDomain', {
      infer: true,
    });
    const url = new URL(path, frontendDomain);
    url.searchParams.set('token', token);
    if (mode) {
      url.searchParams.set('mode', mode);
    }
    return url.toString();
  }
}
