import { ICommand } from '@nestjs/cqrs';
import { CreateIndividualUserDto } from '@/infrastructure/dto/user.dto';

export class CreateIndividualUserCommand implements ICommand {
  constructor(public readonly dto: CreateIndividualUserDto) {}
}
