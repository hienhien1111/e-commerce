import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '@/infrastructure/persistence/entities/user.entity';
import { RoleEntity } from '@/infrastructure/persistence/entities/role.entity';
import type { PasswordHasherPort } from '@/application/identity/ports/password-hasher/password-hasher.port';
import { PASSWORD_HASHER_PORT } from '@/application/identity/ports/password-hasher/password-hasher.port.token';
import { getUserSeedData } from './user-seed.data';

@Injectable()
export class UserSeedService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    @Inject(PASSWORD_HASHER_PORT)
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async run(): Promise<void> {
    const userSeedData = getUserSeedData();

    for (const userData of userSeedData) {
      const existingUser = await this.userRepository.findOne({
        where: { email: userData.email },
      });

      if (!existingUser) {
        const role = await this.roleRepository.findOne({
          where: { name: userData.role },
        });

        const hashedPassword = await this.passwordHasher.hash(
          userData.password,
        );

        const user = this.userRepository.create({
          id: userData.id,
          email: userData.email,
          password: hashedPassword,
          state: userData.state,
          roles: role ? [role] : [],
        });

        await this.userRepository.save(user);
      }
    }
  }
}
