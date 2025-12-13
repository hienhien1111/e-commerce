import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PermissionEntity } from '@/infrastructure/persistence/entities/permission.entity';
import { RoleEntity } from '@/infrastructure/persistence/entities/role.entity';
import {
  getPermissionSeedData,
  rolePermissionSeedData,
} from './permission-seed.data';

@Injectable()
export class PermissionSeedService {
  constructor(
    @InjectRepository(PermissionEntity)
    private readonly permissionRepository: Repository<PermissionEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async run(): Promise<void> {
    const permissionSeedData = getPermissionSeedData();

    for (const permission of permissionSeedData) {
      const existingPermission = await this.permissionRepository.findOne({
        where: { name: permission.name },
      });

      if (!existingPermission) {
        await this.permissionRepository.save(
          this.permissionRepository.create({
            id: permission.id,
            name: permission.name,
            action: permission.action,
            subject: permission.subject,
          }),
        );
      }
    }

    await this.assignPermissionsToRoles();
  }

  private async assignPermissionsToRoles(): Promise<void> {
    for (const [roleName, permissionNames] of Object.entries(
      rolePermissionSeedData,
    )) {
      const role = await this.roleRepository.findOne({
        where: { name: roleName },
        relations: ['permissions'],
      });

      if (!role) continue;

      const permissions = await this.permissionRepository
        .createQueryBuilder('permission')
        .where('permission.name IN (:...names)', { names: permissionNames })
        .getMany();

      role.permissions = permissions;
      await this.roleRepository.save(role);
    }
  }
}
