import { ApiProperty } from '@nestjs/swagger';

export class PositionDto {
  @ApiProperty()
  asset_id: string;

  @ApiProperty()
  symbol: string;

  @ApiProperty()
  exchange: string;

  @ApiProperty()
  asset_class: string;

  @ApiProperty()
  avg_entry_price: string;

  @ApiProperty()
  qty: string;

  @ApiProperty()
  side: string; // "long" or "short"

  @ApiProperty()
  market_value: string;

  @ApiProperty()
  cost_basis: string;

  @ApiProperty()
  unrealized_pl: string;

  @ApiProperty()
  unrealized_plpc: string;

  @ApiProperty()
  unrealized_intraday_pl: string;

  @ApiProperty()
  unrealized_intraday_plpc: string;

  @ApiProperty()
  current_price: string;

  @ApiProperty()
  lastday_price: string;

  @ApiProperty()
  change_today: string;
}
