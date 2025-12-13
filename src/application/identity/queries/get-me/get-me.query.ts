import { IQuery } from '@nestjs/cqrs';
import { JwtPayloadType } from '@/infrastructure/config/jwt-payload.type';

export class GetMeQuery implements IQuery {
  constructor(public readonly userJwtPayload: JwtPayloadType) {}
}
