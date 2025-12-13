import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../entities/role.entity';
import type { RoleRepositoryPort } from '@/application/authorization/ports/role.repository.port';
import { Role } from '@/domain/entities/role';
import { RoleMapper } from '../mappers/role.mapper';
import { NullableType } from '@/utils/types/nullable.type';

@Injectable()
export class TypeOrmRoleRepository implements RoleRepositoryPort {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async findById(id: Role['id']): Promise<NullableType<Role>> {
    const entity = await this.roleRepository.findOne({
      where: { id },
    });

    return entity ? RoleMapper.toDomain(entity) : null;
  }

  async findByName(
    name: NonNullable<Role['name']>,
  ): Promise<NullableType<Role>> {
    const entity = await this.roleRepository.findOne({
      where: { name },
    });

    return entity ? RoleMapper.toDomain(entity) : null;
  }

  async findAll(): Promise<Role[]> {
    const entities = await this.roleRepository.find({
      order: { name: 'ASC' },
    });

    return entities.map((entity) => RoleMapper.toDomain(entity));
  }
}
