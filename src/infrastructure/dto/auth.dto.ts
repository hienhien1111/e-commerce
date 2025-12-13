import { ApiProperty } from '@nestjs/swagger';

export class AuthUrlResponseDto {
  @ApiProperty()
  authUrl: string;
}

export class ExchangeTokenDto {
  @ApiProperty()
  code: string;
}

export class TokenResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  token_type: string;

  @ApiProperty()
  scope: string;
}
