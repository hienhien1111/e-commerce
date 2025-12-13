import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { RoleEntity } from '@/infrastructure/persistence/entities/role.entity';
import { PermissionEntity } from '@/infrastructure/persistence/entities/permission.entity';
import { UserEntity } from '@/infrastructure/persistence/entities/user.entity';
import { RoleSeedService } from './role/role-seed.service';
import { PermissionSeedService } from './permission/permission-seed.service';
import { UserSeedService } from './user/user-seed.service';
import { PasswordHasherModule } from '@/infrastructure/providers/password-hasher.module';
import databaseConfig from '@/database/config/database.config';
import { TypeOrmConfigService } from '@/database/config.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      useClass: TypeOrmConfigService,
    }),
    TypeOrmModule.forFeature([RoleEntity, PermissionEntity, UserEntity]),
    PasswordHasherModule,
  ],
  providers: [RoleSeedService, PermissionSeedService, UserSeedService],
  exports: [RoleSeedService, PermissionSeedService, UserSeedService],
})
export class SeedModule {}
