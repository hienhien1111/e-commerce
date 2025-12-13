import { Module } from '@nestjs/common';
import { BcryptPasswordHasher } from './bcrypt-password-hasher';
import { PASSWORD_HASHER_PORT } from '@/application/identity/ports/password-hasher/password-hasher.port.token';

@Module({
  providers: [
    BcryptPasswordHasher,
    { provide: PASSWORD_HASHER_PORT, useExisting: BcryptPasswordHasher },
  ],
  exports: [PASSWORD_HASHER_PORT],
})
export class PasswordHasherModule {}
