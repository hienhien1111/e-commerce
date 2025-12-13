import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsObject } from 'class-validator';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';

export class WebAuthnLoginDto {
  @ApiProperty({
    description: 'WebAuthn authentication response from the client',
    example: {
      id: 'credential-id',
      rawId: 'credential-raw-id',
      response: {
        clientDataJSON: 'base64-encoded-client-data',
        authenticatorData: 'base64-encoded-authenticator-data',
        signature: 'base64-encoded-signature',
        userHandle: 'base64-encoded-user-handle',
        clientExtensionResults: {},
      },
      type: 'public-key',
      clientExtensionResults: {},
    },
  })
  @IsNotEmpty()
  @IsObject()
  readonly credential: AuthenticationResponseJSON;

  @ApiProperty({
    description: 'Challenge key used to retrieve the stored challenge',
    example: 'unique-challenge-key',
  })
  @IsNotEmpty()
  @IsString()
  readonly challengeKey: string;

  get response() {
    return this.credential;
  }
}
