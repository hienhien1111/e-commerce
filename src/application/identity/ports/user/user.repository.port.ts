import { DeepPartial } from '@/utils/types/deep-partial.type';
import { NullableType } from '@/utils/types/nullable.type';
import { IPaginationOptions } from '@/utils/types/pagination-options';
import { User } from '@/domain/entities/user';
import {
  CreateUserWithRoleInput,
  CreateUserWithRoleIdInput,
} from '@/domain/factories/user.factory';
import {
  FilterUserDto,
  SortUserDto,
} from '@/presentation/http/dtos/query-user.dto';

type FindBySocialIdAndProviderInput = Required<
  Pick<User, 'socialId' | 'provider'>
>;

export interface UserRepositoryPort {
  create(
    data: CreateUserWithRoleInput | CreateUserWithRoleIdInput,
  ): Promise<User>;

  findManyWithPagination(params: {
    filterOptions?: FilterUserDto | null;
    sortOptions?: SortUserDto[] | null;
    paginationOptions: IPaginationOptions;
  }): Promise<User[]>;

  findById(id: User['id']): Promise<NullableType<User>>;
  findByIds(ids: User['id'][]): Promise<User[]>;
  findByEmail(email: User['email']): Promise<NullableType<User>>;
  findBySocialIdAndProvider(
    data: FindBySocialIdAndProviderInput,
  ): Promise<NullableType<User>>;

  update(
    id: User['id'],
    payload: DeepPartial<Omit<User, 'id' | 'createdAt' | 'role'>> & {
      role?: User['role'];
    },
  ): Promise<User | null>;

  remove(id: User['id']): Promise<void>;
}
