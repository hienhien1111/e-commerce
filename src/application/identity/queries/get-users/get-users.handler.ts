import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetUsersQuery } from './get-users.query';
import { GetUsersResult } from './get-users.result';
import type { UserRepositoryPort } from '../../ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '../../ports/user/user.repository.port.token';

@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(query: GetUsersQuery): Promise<GetUsersResult> {
    if (!query.paginationOptions) {
      throw new Error('Pagination options are required');
    }

    return this.userRepository.findManyWithPagination({
      filterOptions: query.filterOptions,
      sortOptions: query.sortOptions,
      paginationOptions: query.paginationOptions,
    });
  }
}
