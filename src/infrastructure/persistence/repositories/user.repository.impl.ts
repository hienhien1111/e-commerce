import { Inject, Injectable } from '@nestjs/common';
import type {
  UserRepositoryPort as AuthUserRepositoryPort,
  UserRepositoryPort as UserModuleRepositoryPort,
} from '@/application/identity/ports/user/user.repository.port';
import { NullableType } from '@/utils/types/nullable.type';
import { User } from '@/domain/entities/user';
import { CreateUserWithRoleInput } from '@/domain/factories/user.factory';
import { USER_REPOSITORY_PORT as USER_MODULE_REPOSITORY_PORT } from '@/application/identity/ports/user/user.repository.port.token';
import { DeepPartial } from '@/utils/types/deep-partial.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import {
  FilterUserDto,
  SortUserDto,
} from '@/presentation/http/dtos/query-user.dto';

@Injectable()
export class UserRepositoryImpl implements AuthUserRepositoryPort {
  constructor(
    @Inject(USER_MODULE_REPOSITORY_PORT)
    private readonly userModuleRepository: UserModuleRepositoryPort,
  ) {}

  findById(id: User['id']): Promise<NullableType<User>> {
    return this.userModuleRepository.findById(id);
  }

  findByEmail(email: User['email']): Promise<NullableType<User>> {
    return this.userModuleRepository.findByEmail(email);
  }

  findBySocialIdAndProvider(data: {
    socialId: string;
    provider: string;
  }): Promise<NullableType<User>> {
    return this.userModuleRepository.findBySocialIdAndProvider(data);
  }

  create(data: CreateUserWithRoleInput): Promise<User> {
    return this.userModuleRepository.create(data);
  }

  update(
    id: User['id'],
    payload: DeepPartial<Omit<User, 'id' | 'createdAt' | 'role'>> & {
      role?: User['role'];
    },
  ): Promise<User | null> {
    return this.userModuleRepository.update(id, payload);
  }

  remove(id: User['id']): Promise<void> {
    return this.userModuleRepository.remove(id);
  }

  findManyWithPagination(params: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]> {
    return this.userModuleRepository.findManyWithPagination(params);
  }

  findByIds(ids: User['id'][]): Promise<User[]> {
    return this.userModuleRepository.findByIds(ids);
  }
}
