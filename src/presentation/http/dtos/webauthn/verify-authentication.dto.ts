import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

export class VerifyAuthenticationDto {
  @ApiProperty({ description: 'Challenge key from authentication options' })
  @IsString()
  @IsNotEmpty()
  challengeKey: string;

  @ApiProperty({ description: 'WebAuthn authentication response' })
  @IsObject()
  response: AuthenticationResponseJSON;
}
