import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Request,
  Post,
  UseGuards,
  Patch,
  Delete,
  SerializeOptions,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
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
import { DeleteUserCommand } from '@/application/identity/commands/delete-user';
import { GetMeQuery } from '@/application/identity/queries/get-me';
import { AuthLoginCommand } from '@/application/identity/commands/login';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiOperation,
  ApiNoContentResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthForgotPasswordDto } from '../dtos/auth-forgot-password.dto';
import { AuthConfirmEmailDto } from '../dtos/auth-confirm-email.dto';
import { AuthResetPasswordDto } from '../dtos/auth-reset-password.dto';
import { AuthUpdateDto } from '../dtos/auth-update.dto';
import { AuthGuard } from '@nestjs/passport';
import { AuthRegisterLoginDto } from '../dtos/auth-register-login.dto';
import { AuthLoginDto } from '../dtos/auth-login.dto';
import { LoginResponseDto } from '../dtos/login-response.dto';
import { NullableType } from '@/utils/types/nullable.type';
import { User } from '@/domain/entities/user';
import { UserDto } from '@/presentation/http/dtos/user.dto';
import { RefreshResponseDto } from '../dtos/refresh-response.dto';
import { WebAuthnLoginDto } from '../dtos/webauthn-login.dto';
@ApiTags('Auth')
@Controller({
  version: '1',
})
export class AuthController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @SerializeOptions({
    groups: ['me'],
  })
  @Post('email/login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({
    type: LoginResponseDto,
    description: 'Login successful',
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @ApiUnprocessableEntityResponse({ description: 'Invalid credentials' })
  @HttpCode(HttpStatus.OK)
  public async login(
    @Body() loginDto: AuthLoginDto,
  ): Promise<LoginResponseDto> {
    return this.commandBus.execute(new AuthLoginCommand(loginDto));
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

  @ApiBearerAuth()
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
  public me(@Request() request): Promise<NullableType<User>> {
    return this.queryBus.execute(new GetMeQuery(request.user));
  }

  @ApiBearerAuth()
  @ApiOkResponse({
    type: RefreshResponseDto,
    description: 'Token refreshed successfully',
  })
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiUnauthorizedResponse({ description: 'Invalid refresh token' })
  @SerializeOptions({
    groups: ['me'],
  })
  @Post('refresh')
  @UseGuards(AuthGuard('jwt-refresh'))
  @HttpCode(HttpStatus.OK)
  public refresh(@Request() request): Promise<RefreshResponseDto> {
    return this.commandBus.execute(
      new RefreshTokenCommand(request.user.sessionId, request.user.hash),
    );
  }

  @ApiBearerAuth()
  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Logout current session' })
  @ApiNoContentResponse({ description: 'Logged out successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async logout(@Request() request): Promise<void> {
    await this.commandBus.execute(new LogoutCommand(request.user.sessionId));
  }

  @ApiBearerAuth()
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
    @Request() request,
    @Body() userDto: AuthUpdateDto,
  ): Promise<NullableType<User>> {
    return this.commandBus.execute(
      new UpdateUserCommand(request.user.id, userDto),
    );
  }

  @ApiBearerAuth()
  @Delete('me')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiNoContentResponse({ description: 'User deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @HttpCode(HttpStatus.NO_CONTENT)
  public async delete(@Request() request): Promise<void> {
    return this.commandBus.execute(new DeleteUserCommand(request.user.id));
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
    type: LoginResponseDto,
    description: 'Login successful',
  })
  @ApiBadRequestResponse({ description: 'Invalid WebAuthn response' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired challenge' })
  @HttpCode(HttpStatus.OK)
  public async loginWithWebAuthn(
    @Body() dto: WebAuthnLoginDto,
  ): Promise<LoginResponseDto> {
    return this.commandBus.execute(new AuthLoginCommand(dto));
  }
}
