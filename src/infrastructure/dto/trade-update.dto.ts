import { ApiProperty } from '@nestjs/swagger';

export class TradeUpdateEventDto {
  @ApiProperty({
    description: 'Event type',
    enum: [
      'new',
      'fill',
      'partial_fill',
      'canceled',
      'expired',
      'replaced',
      'rejected',
      'pending_new',
      'stopped',
      'pending_cancel',
      'pending_replace',
      'calculated',
      'suspended',
      'order_replace_rejected',
      'order_cancel_rejected',
    ],
  })
  event: string;

  @ApiProperty({ description: 'Execution ID', required: false })
  execution_id?: string;

  @ApiProperty({ description: 'Order details', type: () => Object })
  order: any; // Full order object from Alpaca

  @ApiProperty({ description: 'Timestamp of the event', required: false })
  timestamp?: string;

  @ApiProperty({
    description: 'Price of the fill/partial fill',
    required: false,
  })
  price?: string;

  @ApiProperty({ description: 'Quantity filled', required: false })
  qty?: string;

  @ApiProperty({
    description: 'Position quantity after this event',
    required: false,
  })
  position_qty?: string;
}

export class TradeUpdateMessageDto {
  @ApiProperty({ description: 'Stream name', example: 'trade_updates' })
  stream: string;

  @ApiProperty({ description: 'Trade update event', type: TradeUpdateEventDto })
  data: TradeUpdateEventDto;
}
