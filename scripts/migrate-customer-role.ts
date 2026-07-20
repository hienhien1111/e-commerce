import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';

const LEGACY_ROLE = 'user';
const CUSTOMER_ROLE = 'customer';

type RoleMigrationClient = Prisma.TransactionClient;

/**
 * Converts the former `user` role into `customer` without losing role links.
 * It is intentionally safe to run before every deployment until all legacy
 * databases have been migrated.
 */
export async function migrateCustomerRole(
  prisma: RoleMigrationClient,
): Promise<'renamed' | 'merged' | 'unchanged'> {
  const legacy = await prisma.role.findUnique({
    where: { name: LEGACY_ROLE },
  });
  if (!legacy) return 'unchanged';

  const customer = await prisma.role.findUnique({
    where: { name: CUSTOMER_ROLE },
  });
  if (!customer) {
    await prisma.role.update({
      where: { id: legacy.id },
      data: { name: CUSTOMER_ROLE },
    });
    return 'renamed';
  }

  const [userRoles, rolePermissions] = await Promise.all([
    prisma.userRole.findMany({ where: { roleId: legacy.id } }),
    prisma.rolePermission.findMany({ where: { roleId: legacy.id } }),
  ]);
  for (const link of userRoles) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: { userId: link.userId, roleId: customer.id },
      },
      create: { userId: link.userId, roleId: customer.id },
      update: {},
    });
  }
  for (const link of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: customer.id,
          permissionId: link.permissionId,
        },
      },
      create: { roleId: customer.id, permissionId: link.permissionId },
      update: {},
    });
  }
  await prisma.userRole.deleteMany({ where: { roleId: legacy.id } });
  await prisma.rolePermission.deleteMany({ where: { roleId: legacy.id } });
  await prisma.role.delete({ where: { id: legacy.id } });
  return 'merged';
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const client = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const result = await client.$transaction((transaction) =>
      migrateCustomerRole(transaction),
    );
    console.log(`Customer role migration: ${result}`);
  } finally {
    await client.$disconnect();
  }
}

if (import.meta.main) {
  void main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
