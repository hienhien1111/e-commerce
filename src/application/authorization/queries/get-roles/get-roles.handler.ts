import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetRolesQuery } from './get-roles.query';
import { GetRolesResult } from './get-roles.result';
import type { RoleRepositoryPort } from '../../ports/role.repository.port';
import { ROLE_REPOSITORY_PORT } from '../../ports/tokens';

@QueryHandler(GetRolesQuery)
export class GetRolesHandler implements IQueryHandler<GetRolesQuery> {
  constructor(
    @Inject(ROLE_REPOSITORY_PORT)
    private readonly roleRepository: RoleRepositoryPort,
  ) {}

  async execute(_query: GetRolesQuery): Promise<GetRolesResult> {
    return this.roleRepository.findAll();
  }
}
