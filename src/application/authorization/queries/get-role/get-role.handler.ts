import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetRoleQuery } from './get-role.query';
import { GetRoleResult } from './get-role.result';
import type { RoleRepositoryPort } from '../../ports/role.repository.port';
import { ROLE_REPOSITORY_PORT } from '../../ports/tokens';

@QueryHandler(GetRoleQuery)
export class GetRoleHandler implements IQueryHandler<GetRoleQuery> {
  constructor(
    @Inject(ROLE_REPOSITORY_PORT)
    private readonly roleRepository: RoleRepositoryPort,
  ) {}

  async execute(query: GetRoleQuery): Promise<GetRoleResult> {
    return this.roleRepository.findById(query.id);
  }
}
