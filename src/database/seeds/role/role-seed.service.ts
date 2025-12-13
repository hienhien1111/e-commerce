import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '@/infrastructure/persistence/entities/role.entity';
import { getRoleSeedData } from './role-seed.data';

@Injectable()
export class RoleSeedService {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async run(): Promise<void> {
    const roleSeedData = getRoleSeedData();

    for (const role of roleSeedData) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: role.name },
      });

      if (!existingRole) {
        await this.roleRepository.save(
          this.roleRepository.create({
            id: role.id,
            name: role.name,
          }),
        );
      }
    }
  }
}
