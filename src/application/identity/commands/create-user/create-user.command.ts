import { ICommand } from '@nestjs/cqrs';
import { CreateUserDto } from '@/presentation/http/dtos/create-user.dto';

export class CreateUserCommand implements ICommand {
  constructor(public readonly payload: CreateUserDto) {}
}
