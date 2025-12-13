import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { UserEntity } from '../entities/user.entity';
import type { UserRepositoryPort } from '@/application/identity/ports/user/user.repository.port';
import { User } from '@/domain/entities/user';
import {
  UserFactory,
  CreateUserWithRoleInput,
  CreateUserWithRoleIdInput,
} from '@/domain/factories/user.factory';
import { UserMapper } from '../mappers/user.mapper';
import { NullableType } from '@/utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import {
  FilterUserDto,
  SortUserDto,
} from '@/presentation/http/dtos/query-user.dto';
import { DeepPartial } from '@/utils/types/deep-partial.type';

@Injectable()
export class TypeOrmUserRepository implements UserRepositoryPort {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(
    data: CreateUserWithRoleInput | CreateUserWithRoleIdInput,
  ): Promise<User> {
    const isCreateWithRoleId = (
      input: CreateUserWithRoleInput | CreateUserWithRoleIdInput,
    ): input is CreateUserWithRoleIdInput => {
      return 'roleId' in input && !('role' in input);
    };

    const domainEntity = isCreateWithRoleId(data)
      ? UserFactory.createWithRoleId(data)
      : UserFactory.createWithRole(data);
    const persistenceModel = UserMapper.toPersistence(domainEntity);
    const newEntity = await this.userRepository.save(
      this.userRepository.create(persistenceModel),
    );
    return UserMapper.toDomain(newEntity);
  }

  async findManyWithPagination({
    filterOptions,
    sortOptions,
    paginationOptions,
  }: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    if (filterOptions?.roles?.length) {
      queryBuilder
        .leftJoinAndSelect('user.roles', 'roles')
        .andWhere('roles.id IN (:...roleIds)', {
          roleIds: filterOptions.roles.map((role) => role.id),
        });
    }

    if (paginationOptions.cursor) {
      queryBuilder.andWhere('user.id > :cursor', {
        cursor: paginationOptions.cursor,
      });
    }

    if (sortOptions && sortOptions.length > 0) {
      for (const [index, sort] of sortOptions.entries()) {
        if (index === 0) {
          queryBuilder.orderBy(
            `user.${String(sort.orderBy)}`,
            sort.order.toUpperCase() as 'ASC' | 'DESC',
          );
        } else {
          queryBuilder.addOrderBy(
            `user.${String(sort.orderBy)}`,
            sort.order.toUpperCase() as 'ASC' | 'DESC',
          );
        }
      }
    } else {
      queryBuilder.orderBy('user.id', 'ASC');
    }

    if (!filterOptions?.roles?.length) {
      queryBuilder.leftJoinAndSelect('user.roles', 'roles');
    }

    const entities = await queryBuilder
      .take(paginationOptions.limit + 1)
      .getMany();

    return entities
      .slice(0, paginationOptions.limit)
      .map((entity) => UserMapper.toDomain(entity));
  }

  async findById(id: User['id']): Promise<NullableType<User>> {
    const entity = await this.userRepository.findOne({
      where: { id },
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findByIds(ids: User['id'][]): Promise<User[]> {
    const entities = await this.userRepository.find({
      where: { id: In(ids) },
      relations: ['roles'],
    });

    return entities.map((entity) => UserMapper.toDomain(entity));
  }

  async findByEmail(email: User['email']): Promise<NullableType<User>> {
    if (email === null) {
      return null;
    }

    const entity = await this.userRepository.findOne({
      where: { email },
      relations: ['roles'],
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async findBySocialIdAndProvider({
    socialId,
    provider,
  }: {
    socialId: User['socialId'];
    provider: User['provider'];
  }): Promise<NullableType<User>> {
    if (socialId === null || socialId === undefined) {
      return null;
    }

    const entity = await this.userRepository.findOne({
      where: {
        socialId,
        provider: String(provider),
      },
      relations: ['roles'],
    });

    return entity ? UserMapper.toDomain(entity) : null;
  }

  async update(
    id: User['id'],
    payload: DeepPartial<Omit<User, 'id' | 'createdAt' | 'role'>> & {
      role?: User['role'];
    },
  ): Promise<User | null> {
    const entity = await this.userRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!entity) {
      return null;
    }

    const domainEntity = UserMapper.toDomain(entity);

    if (payload.email !== undefined && payload.email !== null) {
      domainEntity.updateEmail(payload.email);
    }
    if (payload.password !== undefined) {
      domainEntity.updatePassword(payload.password);
    }
    if (payload.firstName !== undefined || payload.lastName !== undefined) {
      domainEntity.updateProfile(payload.firstName, payload.lastName);
    }
    if (payload.role !== undefined) {
      if (payload.role === null) {
        domainEntity.clearRole();
      } else {
        domainEntity.assignRole(payload.role);
      }
    }

    const persistenceModel = UserMapper.toPersistence(domainEntity);
    const updatedEntity = await this.userRepository.save(
      this.userRepository.create({
        ...persistenceModel,
        id,
      }),
    );

    return UserMapper.toDomain(updatedEntity);
  }

  async remove(id: User['id']): Promise<void> {
    await this.userRepository.softDelete({
      id,
    });
  }
}
