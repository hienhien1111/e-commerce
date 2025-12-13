import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CurrencyDto {
  @ApiPropertyOptional()
  code?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  symbol?: string;

  [key: string]: unknown;
}

export class PaymentMethodDto {
  @ApiPropertyOptional()
  code?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  logo?: string;

  [key: string]: unknown;
}

export class TokenDto {
  @ApiPropertyOptional()
  code?: string;

  @ApiPropertyOptional()
  name?: string;

  @ApiPropertyOptional()
  symbol?: string;

  [key: string]: unknown;
}

export class ListCurrenciesResponseDto {
  @ApiProperty({ type: [CurrencyDto] })
  currencies: CurrencyDto[];

  @ApiPropertyOptional()
  total?: number;

  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  [key: string]: unknown;
}

export class ListPaymentMethodsResponseDto {
  @ApiProperty({ type: [PaymentMethodDto] })
  paymentMethods: PaymentMethodDto[];

  @ApiPropertyOptional()
  total?: number;

  @ApiPropertyOptional()
  page?: number;

  @ApiPropertyOptional()
  limit?: number;

  [key: string]: unknown;
}

export class ListTokensResponseDto {
  @ApiProperty({ type: [TokenDto] })
  tokens: TokenDto[];

  @ApiPropertyOptional()
  total?: number;

  [key: string]: unknown;
}
