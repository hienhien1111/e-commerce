import { Module, Global } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { RoleController } from '@/presentation/http/controllers/role.controller';

import { RolesGuard } from '@/infrastructure/guards/roles.guard';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { CaslAbilityFactory } from '@/infrastructure/casl/casl-ability.factory';

import { PrismaRoleRepository } from '@/infrastructure/persistence/repositories/prisma-role.repository';
import { PrismaPermissionRepository } from '@/infrastructure/persistence/repositories/prisma-permission.repository';

import { GetRoleHandler } from '@/application/authorization/queries/get-role';
import { GetRolesHandler } from '@/application/authorization/queries/get-roles';

import { ROLE_REPOSITORY_PORT } from '@/application/authorization/ports/tokens';
import { PERMISSION_REPOSITORY_PORT } from '@/application/authorization/ports/permission.repository.port.token';

const QueryHandlers = [GetRoleHandler, GetRolesHandler];

@Global()
@Module({
  imports: [CqrsModule],
  controllers: [RoleController],
  providers: [
    RolesGuard,
    PermissionsGuard,
    CaslAbilityFactory,

    PrismaRoleRepository,
    PrismaPermissionRepository,

    ...QueryHandlers,

    {
      provide: ROLE_REPOSITORY_PORT,
      useExisting: PrismaRoleRepository,
    },
    {
      provide: PERMISSION_REPOSITORY_PORT,
      useExisting: PrismaPermissionRepository,
    },
  ],
  exports: [
    RolesGuard,
    PermissionsGuard,
    CaslAbilityFactory,
    ROLE_REPOSITORY_PORT,
    PERMISSION_REPOSITORY_PORT,
  ],
})
export class AuthorizationModule {}
