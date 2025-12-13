import { ICommand } from '@nestjs/cqrs';
import { AuthRegisterLoginDto } from '@/presentation/http/dtos/auth-register-login.dto';

export class RegisterCommand implements ICommand {
  constructor(public readonly payload: AuthRegisterLoginDto) {}
}
