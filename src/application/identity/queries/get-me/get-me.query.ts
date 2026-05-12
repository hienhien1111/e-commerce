import { IQuery } from '@nestjs/cqrs';
import { JwtPayloadType } from '@/application/identity/types/jwt-payload.type';

export class GetMeQuery implements IQuery {
  constructor(public readonly userJwtPayload: JwtPayloadType) {}
}
