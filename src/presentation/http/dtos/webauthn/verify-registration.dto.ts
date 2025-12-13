import { IsString, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

export class VerifyRegistrationDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ description: 'Challenge key from registration options' })
  @IsString()
  @IsNotEmpty()
  challengeKey: string;

  @ApiProperty({ description: 'WebAuthn registration response' })
  @IsObject()
  response: RegistrationResponseJSON;
}
