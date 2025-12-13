import { NestFactory } from '@nestjs/core';
import { SeedModule } from './seed.module';
import { RoleSeedService } from './role/role-seed.service';
import { PermissionSeedService } from './permission/permission-seed.service';
import { UserSeedService } from './user/user-seed.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(SeedModule);

  console.log('🌱 Starting seed...');

  try {
    console.log('📦 Seeding roles...');
    const roleSeedService = app.get(RoleSeedService);
    await roleSeedService.run();
    console.log('✅ Roles seeded successfully');

    console.log('📦 Seeding permissions...');
    const permissionSeedService = app.get(PermissionSeedService);
    await permissionSeedService.run();
    console.log('✅ Permissions seeded successfully');

    console.log('📦 Seeding users...');
    const userSeedService = app.get(UserSeedService);
    await userSeedService.run();
    console.log('✅ Users seeded successfully');

    console.log('🎉 Seed completed successfully!');
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await app.close();
  }
}

bootstrap();
