import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccountDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  account_number: string;

  @ApiProperty()
  status: string;

  @ApiPropertyOptional()
  crypto_status?: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  buying_power: string;

  @ApiProperty()
  regt_buying_power: string;

  @ApiProperty()
  daytrading_buying_power: string;

  @ApiProperty()
  cash: string;

  @ApiProperty()
  portfolio_value: string;

  @ApiProperty()
  pattern_day_trader: boolean;

  @ApiProperty()
  trading_blocked: boolean;

  @ApiProperty()
  transfers_blocked: boolean;

  @ApiProperty()
  account_blocked: boolean;

  @ApiProperty()
  created_at: string;

  @ApiProperty()
  trade_suspended_by_user: boolean;

  @ApiProperty()
  multiplier: string;

  @ApiProperty()
  shorting_enabled: boolean;

  @ApiProperty()
  equity: string;

  @ApiProperty()
  last_equity: string;

  @ApiProperty()
  long_market_value: string;

  @ApiProperty()
  short_market_value: string;

  @ApiProperty()
  initial_margin: string;

  @ApiProperty()
  maintenance_margin: string;

  @ApiProperty()
  last_maintenance_margin: string;

  @ApiProperty()
  sma: string;

  @ApiProperty()
  daytrade_count: number;
}
