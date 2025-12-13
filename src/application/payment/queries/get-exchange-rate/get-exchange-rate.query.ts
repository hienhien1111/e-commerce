import { IQuery } from '@nestjs/cqrs';
import { GetExchangeRateDto } from '@/infrastructure/dto/exchange-rate.dto';

export class GetExchangeRateQuery implements IQuery {
  constructor(public readonly dto: GetExchangeRateDto) {}
}
