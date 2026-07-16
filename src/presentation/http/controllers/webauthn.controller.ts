import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { GenerateRegistrationOptionsCommand } from '@/application/identity/commands/webauthn/generate-registration-options';
import { VerifyRegistrationCommand } from '@/application/identity/commands/webauthn/verify-registration';
import { GenerateAuthenticationOptionsCommand } from '@/application/identity/commands/webauthn/generate-authentication-options';
import { GenerateRegistrationOptionsDto } from '../dtos/webauthn/generate-registration-options.dto';
import { VerifyRegistrationDto } from '../dtos/webauthn/verify-registration.dto';
import { GenerateAuthenticationOptionsDto } from '../dtos/webauthn/generate-authentication-options.dto';
import { GetUserCredentialsQuery } from '@/application/identity/queries/webauthn/get-user-credentials';
import { RevokeCredentialCommand } from '@/application/identity/commands/webauthn/revoke-credential';
import { CurrentUser } from '@/decorators/current-user.decorator';
import { User } from '@/domain/entities/user';

@ApiTags('WebAuthn')
@Controller({
  path: 'webauthn',
  version: '1',
})
export class WebAuthnController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post('registration/options')
  @ApiOperation({ summary: 'Generate WebAuthn registration options' })
  @ApiOkResponse({ description: 'Registration options generated successfully' })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @HttpCode(HttpStatus.OK)
  async generateRegistrationOptions(
    @Body() dto: GenerateRegistrationOptionsDto,
  ) {
    return this.commandBus.execute(
      new GenerateRegistrationOptionsCommand(
        dto.userId,
        dto.userDisplayName,
        dto.userEmail,
      ),
    );
  }

  @Post('registration/verify')
  @ApiOperation({ summary: 'Verify WebAuthn registration response' })
  @ApiOkResponse({ description: 'Registration verified successfully' })
  @ApiBadRequestResponse({ description: 'Verification failed' })
  @HttpCode(HttpStatus.OK)
  async verifyRegistration(@Body() dto: VerifyRegistrationDto) {
    return this.commandBus.execute(
      new VerifyRegistrationCommand(dto.userId, dto.response, dto.challengeKey),
    );
  }

  @Post('authentication/options')
  @ApiOperation({ summary: 'Generate WebAuthn authentication options' })
  @ApiOkResponse({
    description: 'Authentication options generated successfully',
  })
  @ApiBadRequestResponse({ description: 'Invalid input' })
  @HttpCode(HttpStatus.OK)
  async generateAuthenticationOptions(
    @Body() dto: GenerateAuthenticationOptionsDto,
  ) {
    return this.commandBus.execute(
      new GenerateAuthenticationOptionsCommand(dto.userId, dto.userEmail),
    );
  }

  @Get('credentials')
  @UseGuards(AuthGuard('jwt'))
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Get user WebAuthn credentials' })
  @ApiOkResponse({ description: 'User credentials retrieved successfully' })
  async getUserCredentials(@CurrentUser() user: User) {
    return this.queryBus.execute(new GetUserCredentialsQuery(user.id));
  }

  @Delete('credentials/:credentialId')
  @UseGuards(AuthGuard('jwt'))
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'Revoke WebAuthn credential' })
  @ApiParam({ name: 'credentialId', description: 'Credential ID to revoke' })
  @ApiOkResponse({ description: 'Credential revoked successfully' })
  @HttpCode(HttpStatus.OK)
  async revokeCredential(
    @Param('credentialId') credentialId: string,
    @CurrentUser() user: User,
  ) {
    return this.commandBus.execute(
      new RevokeCredentialCommand(credentialId, user.id),
    );
  }
}
