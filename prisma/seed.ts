import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, PermissionAction, PermissionSubject } from '../src/generated/prisma/client';
import { generateUuidV7 } from '../src/utils/uuid-v7';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
const prisma = new PrismaClient({ adapter });

const ROLE = { ADMIN: 'admin', USER: 'user' } as const;

async function seedRoles() {
  console.log('📦 Seeding roles...');
  for (const name of Object.values(ROLE)) {
    await prisma.role.upsert({
      where: { name },
      create: { id: generateUuidV7(), name },
      update: {},
    });
  }
  console.log('✅ Roles seeded');
}

async function seedPermissions() {
  console.log('📦 Seeding permissions...');
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: ROLE.ADMIN } });

  // Admin: manage all
  const adminPerm = await prisma.permission.upsert({
    where: { name: 'admin:manage:all' },
    create: {
      id: generateUuidV7(),
      name: 'admin:manage:all',
      action: PermissionAction.manage,
      subject: PermissionSubject.all,
    },
    update: {},
  });
  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: adminRole.id, permissionId: adminPerm.id } },
    create: { roleId: adminRole.id, permissionId: adminPerm.id },
    update: {},
  });
  console.log('✅ Permissions seeded');
}

async function main() {
  console.log('🌱 Starting Prisma seed...');
  await seedRoles();
  await seedPermissions();
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
