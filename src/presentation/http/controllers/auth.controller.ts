import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Patch,
  Delete,
  UploadedFile,
  SerializeOptions,
  Req,
  Res,
  UnprocessableEntityException,
  ParseFilePipe,
  FileTypeValidator,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { CurrentUser } from '@/decorators/current-user.decorator';
import type { AuthenticatedUser } from '@/infrastructure/strategies/jwt.strategy';
import type { JwtRefreshPayloadType } from '@/infrastructure/config/jwt-refresh-payload.type';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RegisterCommand } from '@/application/identity/commands/register';
import {
  ConfirmEmailCommand,
  ConfirmNewEmailCommand,
} from '@/application/identity/commands/confirm-email';
import { ForgotPasswordCommand } from '@/application/identity/commands/forgot-password';
import { ResetPasswordCommand } from '@/application/identity/commands/reset-password';
import { RefreshTokenCommand } from '@/application/identity/commands/refresh-token';
import { LogoutCommand } from '@/application/identity/commands/logout';
import { UpdateUserCommand } from '@/application/identity/commands/update-user';
import { UploadAvatarCommand } from '@/application/identity/commands/upload-avatar';
import { DeleteUserCommand } from '@/application/identity/commands/delete-user';
import { GetMeQuery } from '@/application/identity/queries/get-me';
import { AuthLoginCommand } from '@/application/identity/commands/login';
import {
  GoogleLoginCommand,
  type GoogleProfile,
} from '@/application/identity/commands/google-login';
import { GoogleOAuthConfiguredGuard } from '@/infrastructure/guards/google-oauth-configured.guard';
import { AllConfigType } from '@/config/config.type';
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiBody,
  ApiConsumes,
  ApiPayloadTooLargeResponse,
  ApiServiceUnavailableResponse,
} from '@nestjs/swagger';
import { AuthForgotPasswordDto } from '../dtos/auth-forgot-password.dto';
import { AuthConfirmEmailDto } from '../dtos/auth-confirm-email.dto';
import { AuthResetPasswordDto } from '../dtos/auth-reset-password.dto';
import { AuthUpdateDto } from '../dtos/auth-update.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRegisterLoginDto } from '../dtos/auth-register-login.dto';
import { AuthLoginDto } from '../dtos/auth-login.dto';
import { NullableType } from '@/utils/types/nullable.type';
import { User } from '@/domain/entities/user';
import { UserDto } from '@/presentation/http/dtos/user.dto';
import { WebAuthnLoginDto } from '../dtos/webauthn-login.dto';
import {
  clearAuthCookies,
  setAuthCookies,
} from '@/infrastructure/auth/auth-cookie.util';
import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
} from '@/infrastructure/auth/auth-cookie.constants';

type GoogleOAuthRequest = Request & { user: GoogleProfile };

function getValidationErrorCode(error: unknown): string | undefined {
  if (!(error instanceof UnprocessableEntityException)) {
    return undefined;
  }

  const response = error.getResponse();
  if (typeof response !== 'object' || response === null) {
    return undefined;
  }

  const errors = (response as { errors?: unknown }).errors;
  if (typeof errors !== 'object' || errors === null) {
    return undefined;
  }

  const emailError = (errors as Record<string, unknown>).email;
  return typeof emailError === 'string' ? emailError : undefined;
}

@ApiTags('Auth')
@Controller({
  version: '1',
})
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly configService: ConfigService<AllConfigType>,
  ) {}

  @SerializeOptions({
    groups: ['me'],
  })
  @Post('email/login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({
    type: UserDto,
    description: 'Login successful',
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body() loginDto: AuthLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<User> {
    const result = await this.commandBus.execute(
      new AuthLoginCommand(loginDto),
    );
    setAuthCookies(response, result, this.configService);
    return result.user;
  }

  @Post('email/register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiNoContentResponse({ description: 'Registration successful' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnprocessableEntityResponse({ description: 'Email already exists' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async register(@Body() createUserDto: AuthRegisterLoginDto): Promise<void> {
    return this.commandBus.execute(new RegisterCommand(createUserDto));
  }

  @Post('email/confirm')
  @ApiOperation({ summary: 'Confirm email address' })
  @ApiNoContentResponse({ description: 'Email confirmed successfully' })
  @ApiBadRequestResponse({ description: 'Invalid hash' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid or expired hash' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new ConfirmEmailCommand(confirmEmailDto.hash),
    );
  }

  @Post('email/confirm/new')
  @ApiOperation({ summary: 'Confirm new email address' })
  @ApiNoContentResponse({ description: 'New email confirmed successfully' })
  @ApiBadRequestResponse({ description: 'Invalid hash' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid or expired hash' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async confirmNewEmail(
    @Body() confirmEmailDto: AuthConfirmEmailDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new ConfirmNewEmailCommand(confirmEmailDto.hash),
    );
  }

  @Post('forgot/password')
  @ApiOperation({ summary: 'Request password reset' })
  @ApiNoContentResponse({ description: 'Password reset email sent' })
  @ApiBadRequestResponse({ description: 'Invalid email' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async forgotPassword(
    @Body() forgotPasswordDto: AuthForgotPasswordDto,
  ): Promise<void> {
    return this.commandBus.execute(
      new ForgotPasswordCommand(forgotPasswordDto.email),
    );
  }

  @Post('reset/password')
  @ApiOperation({ summary: 'Reset password' })
  @ApiNoContentResponse({ description: 'Password reset successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid or expired hash' })
  @HttpCode(HttpStatus.NO_CONTENT)
  resetPassword(@Body() resetPasswordDto: AuthResetPasswordDto): Promise<void> {
    return this.commandBus.execute(
      new ResetPasswordCommand(
        resetPasswordDto.hash,
        resetPasswordDto.password,
      ),
    );
  }

  @Get('google')
  @UseGuards(GoogleOAuthConfiguredGuard, AuthGuard('google'))
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @HttpCode(HttpStatus.OK)
  async googleAuth(): Promise<void> {
    // Passport strategy automatically redirects to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthConfiguredGuard, AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  @HttpCode(HttpStatus.OK)
  async googleAuthRedirect(
    @Req() req: GoogleOAuthRequest,
    @Res() res: Response,
  ): Promise<void> {
    const frontendDomain = this.configService.getOrThrow('app.frontendDomain', {
      infer: true,
    });
    const redirectUrl = new URL('/login', frontendDomain);

    try {
      const result = await this.commandBus.execute(
        new GoogleLoginCommand(req.user),
      );
      setAuthCookies(res, result, this.configService);
      redirectUrl.pathname = '/profile';
    } catch (error: unknown) {
      const validationError = getValidationErrorCode(error);
      redirectUrl.searchParams.set(
        'error',
        validationError?.startsWith('needLoginViaProvider')
          ? 'use_email_login'
          : 'google_login_failed',
      );
    }

    res.redirect(redirectUrl.toString());
  }

  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @SerializeOptions({
    groups: ['me'],
  })
  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({
    type: UserDto,
    description: 'Current user information',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @HttpCode(HttpStatus.OK)
  public me(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<NullableType<User>> {
    return this.queryBus.execute(new GetMeQuery(user.id));
  }

  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('me/avatar')
  @UseGuards(AuthGuard('jwt'))
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Upload current user avatar' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiOkResponse({
    type: UserDto,
    description: 'Avatar uploaded successfully',
  })
  @ApiBadRequestResponse({
    description: 'A JPEG or PNG avatar file is required',
  })
  @ApiPayloadTooLargeResponse({ description: 'Avatar must not exceed 2 MiB' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiServiceUnavailableResponse({ description: 'Avatar storage unavailable' })
  @HttpCode(HttpStatus.OK)
  public uploadAvatar(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new FileTypeValidator({ fileType: /^image\/(jpeg|png)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<User> {
    return this.commandBus.execute(
      new UploadAvatarCommand(user.id, file.buffer),
    );
  }

  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiNoContentResponse({ description: 'Session refreshed successfully' })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.NO_CONTENT)
  public async refresh(
    @CurrentUser() payload: JwtRefreshPayloadType,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const result = await this.commandBus.execute(
      new RefreshTokenCommand(payload.sessionId, payload.hash),
    );
    setAuthCookies(response, result, this.configService);
  }

  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Logout current session' })
  @ApiNoContentResponse({ description: 'Logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.commandBus.execute(new LogoutCommand(user.sessionId));
    clearAuthCookies(response, this.configService);
  }

  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @SerializeOptions({
    groups: ['me'],
  })
  @Patch('me')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiOkResponse({
    type: UserDto,
    description: 'User updated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiUnprocessableEntityResponse({ description: 'Email already exists' })
  public update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    return this.commandBus.execute(new UpdateUserCommand(user.id, userDto));
  }

  @ApiCookieAuth(ACCESS_TOKEN_COOKIE)
  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.commandBus.execute(new DeleteUserCommand(user.id));
    clearAuthCookies(response, this.configService);
  }

  @Post('webauthn/login')
  @ApiOperation({
    summary: 'Login with WebAuthn',
    description: 'Unified login endpoint supporting WebAuthn authentication',
  })
  @ApiBody({
    type: WebAuthnLoginDto,
    description: 'WebAuthn authentication response and challenge key',
  })
  @ApiOkResponse({
    type: UserDto,
    description: 'Login successful',
  })
  @ApiBadRequestResponse({ description: 'Invalid WebAuthn response' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired challenge' })
  @HttpCode(HttpStatus.OK)
  public async loginWithWebAuthn(
    @Body() dto: WebAuthnLoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<User> {
    const result = await this.commandBus.execute(new AuthLoginCommand(dto));
    setAuthCookies(response, result, this.configService);
    return result.user;
  }
}
