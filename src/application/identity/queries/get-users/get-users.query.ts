import { IQuery } from '@nestjs/cqrs';
import {
  FilterUserDto,
  SortUserDto,
} from '@/presentation/http/dtos/query-user.dto';
import { IPaginationOptions } from '@/utils/types/pagination-options';

export class GetUsersQuery implements IQuery {
  constructor(
    public readonly filterOptions?: FilterUserDto | null,
    public readonly sortOptions?: SortUserDto[] | null,
    public readonly paginationOptions?: IPaginationOptions,
  ) {}
}
