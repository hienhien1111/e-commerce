import { Module, Global } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TypeOrmModule } from '@nestjs/typeorm';

import { RoleEntity } from '@/infrastructure/persistence/entities/role.entity';
import { PermissionEntity } from '@/infrastructure/persistence/entities/permission.entity';

import { RoleController } from '@/presentation/http/controllers/role.controller';

import { RolesGuard } from '@/infrastructure/guards/roles.guard';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { CaslAbilityFactory } from '@/infrastructure/casl/casl-ability.factory';

import { TypeOrmRoleRepository } from '@/infrastructure/persistence/repositories/role.repository';
import { TypeOrmPermissionRepository } from '@/infrastructure/persistence/repositories/permission.repository';

import { GetRoleHandler } from '@/application/authorization/queries/get-role';
import { GetRolesHandler } from '@/application/authorization/queries/get-roles';

import { ROLE_REPOSITORY_PORT } from '@/application/authorization/ports/tokens';
import { PERMISSION_REPOSITORY_PORT } from '@/application/authorization/ports/permission.repository.port.token';

const QueryHandlers = [GetRoleHandler, GetRolesHandler];

@Global()
@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity]),
  ],
  controllers: [RoleController],
  providers: [
    RolesGuard,
    PermissionsGuard,
    CaslAbilityFactory,

    TypeOrmRoleRepository,
    TypeOrmPermissionRepository,

    ...QueryHandlers,

    {
      provide: ROLE_REPOSITORY_PORT,
      useExisting: TypeOrmRoleRepository,
    },
    {
      provide: PERMISSION_REPOSITORY_PORT,
      useExisting: TypeOrmPermissionRepository,
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
