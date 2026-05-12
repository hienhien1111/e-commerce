import { IQuery } from '@nestjs/cqrs';
import {
  UserFilterCriteria,
  UserSortCriteria,
} from '@/application/identity/types/user-query.types';
import { IPaginationOptions } from '@/utils/types/pagination-options';

export class GetUsersQuery implements IQuery {
  constructor(
    public readonly filterOptions?: UserFilterCriteria | null,
    public readonly sortOptions?: UserSortCriteria[] | null,
    public readonly paginationOptions?: IPaginationOptions,
  ) {}
}
