import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  PrismaClient,
  PermissionAction,
  PermissionSubject,
} from '../src/generated/prisma/client';
import { generateUuidV7 } from '../src/utils/uuid-v7';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
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
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: ROLE.ADMIN },
  });

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
    where: {
      roleId_permissionId: { roleId: adminRole.id, permissionId: adminPerm.id },
    },
    create: { roleId: adminRole.id, permissionId: adminPerm.id },
    update: {},
  });
  console.log('✅ Permissions seeded');
}

async function seedDevelopmentAdmin() {
  if (
    process.env.NODE_ENV !== 'development' &&
    process.env.NODE_ENV !== 'test'
  ) {
    return;
  }

  console.log('📦 Seeding development admin...');
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: ROLE.ADMIN },
  });
  const email = 'admin@example.com';
  const existing = await prisma.user.findUnique({ where: { email } });

  if (!existing) {
    const password = await bcrypt.hash('Admin@123456', 12);
    await prisma.user.create({
      data: {
        id: generateUuidV7(),
        email,
        password,
        provider: 'email',
        socialId: null,
        firstName: 'Development',
        lastName: 'Admin',
        verifiedAt: new Date(),
        roles: { create: [{ roleId: adminRole.id }] },
      },
    });
  } else {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        verifiedAt: existing.verifiedAt ?? new Date(),
        roles: {
          deleteMany: {},
          create: [{ roleId: adminRole.id }],
        },
      },
    });
  }
  console.log('✅ Development admin seeded');
}

async function main() {
  console.log('🌱 Starting Prisma seed...');
  await seedRoles();
  await seedPermissions();
  await seedDevelopmentAdmin();
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
