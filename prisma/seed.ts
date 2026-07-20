import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  DiscountType,
  PermissionAction,
  PermissionSubject,
  PrismaClient,
} from '../src/generated/prisma/client';
import { generateUuidV7 } from '../src/utils/uuid-v7';
import bcrypt from 'bcryptjs';
import { migrateCustomerRole } from '../scripts/migrate-customer-role';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

const ROLE = { ADMIN: 'admin', CUSTOMER: 'customer' } as const;

const customerPermissions: Array<[PermissionAction, PermissionSubject]> = [
  [PermissionAction.create, PermissionSubject.cart],
  [PermissionAction.read, PermissionSubject.cart],
  [PermissionAction.update, PermissionSubject.cart],
  [PermissionAction.delete, PermissionSubject.cart],
];

const obsoleteCustomerPermissionNames = [
  'customer:read:product',
  'customer:read:category',
  'customer:read:coupon',
  'customer:create:order',
  'customer:read:order',
  'customer:update:order',
  'customer:create:payment',
  'customer:read:payment',
];

async function seedRolesAndPermissions() {
  await prisma.$transaction(async (transaction) => {
    await migrateCustomerRole(transaction);
    for (const name of Object.values(ROLE)) {
      await transaction.role.upsert({
        where: { name },
        create: { id: generateUuidV7(), name },
        update: { deletedAt: null },
      });
    }
  });
  const [adminRole, customerRole] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: ROLE.ADMIN } }),
    prisma.role.findUniqueOrThrow({ where: { name: ROLE.CUSTOMER } }),
  ]);
  const adminPermission = await prisma.permission.upsert({
    where: { name: 'admin:manage:all' },
    create: {
      id: generateUuidV7(),
      name: 'admin:manage:all',
      action: PermissionAction.manage,
      subject: PermissionSubject.all,
    },
    update: { deletedAt: null },
  });
  await prisma.rolePermission.upsert({
    where: {
      roleId_permissionId: {
        roleId: adminRole.id,
        permissionId: adminPermission.id,
      },
    },
    create: { roleId: adminRole.id, permissionId: adminPermission.id },
    update: {},
  });
  await prisma.rolePermission.deleteMany({
    where: {
      roleId: customerRole.id,
      permission: { name: { in: obsoleteCustomerPermissionNames } },
    },
  });
  for (const [action, subject] of customerPermissions) {
    const name = `customer:${action}:${subject}`;
    const permission = await prisma.permission.upsert({
      where: { name },
      create: { id: generateUuidV7(), name, action, subject },
      update: { deletedAt: null },
    });
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: customerRole.id,
          permissionId: permission.id,
        },
      },
      create: { roleId: customerRole.id, permissionId: permission.id },
      update: {},
    });
  }
}

async function seedDevelopmentUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
}) {
  const password = await bcrypt.hash(input.password, 12);
  await prisma.user.upsert({
    where: { email: input.email },
    create: {
      id: generateUuidV7(),
      email: input.email,
      password,
      provider: 'email',
      firstName: input.firstName,
      lastName: input.lastName,
      verifiedAt: new Date(),
      roles: { create: [{ roleId: input.roleId }] },
    },
    update: {
      password,
      firstName: input.firstName,
      lastName: input.lastName,
      verifiedAt: new Date(),
      deletedAt: null,
      roles: { deleteMany: {}, create: [{ roleId: input.roleId }] },
    },
  });
}

const categories = [
  ['Điện tử', 'dien-tu'],
  ['Thời trang', 'thoi-trang'],
  ['Gia dụng', 'gia-dung'],
  ['Sách', 'sach'],
  ['Mỹ phẩm', 'my-pham'],
] as const;

async function seedDevelopmentCatalog() {
  const categoryRows = await Promise.all(
    categories.map(([name, slug], sortOrder) =>
      prisma.category.upsert({
        where: { slug },
        create: {
          id: generateUuidV7(),
          name,
          slug,
          sortOrder,
          isActive: true,
        },
        update: { name, sortOrder, isActive: true, deletedAt: null },
      }),
    ),
  );
  for (const [categoryIndex, category] of categoryRows.entries()) {
    for (let index = 1; index <= 3; index += 1) {
      const slug = `demo-${categories[categoryIndex][1]}-${index}`;
      const product = await prisma.product.upsert({
        where: { slug },
        create: {
          id: generateUuidV7(),
          name: `${categories[categoryIndex][0]} mẫu ${index}`,
          slug,
          description: `Sản phẩm demo thuộc nhóm ${categories[categoryIndex][0]}.`,
          price: 100000 + categoryIndex * 50000 + index * 10000,
          comparePrice: 150000 + categoryIndex * 50000 + index * 10000,
          stock: 20,
          sku: `DEMO-${categoryIndex + 1}-${index}`,
          categoryId: category.id,
          isActive: true,
        },
        update: {
          name: `${categories[categoryIndex][0]} mẫu ${index}`,
          price: 100000 + categoryIndex * 50000 + index * 10000,
          comparePrice: 150000 + categoryIndex * 50000 + index * 10000,
          stock: 20,
          categoryId: category.id,
          isActive: true,
          deletedAt: null,
        },
      });
      const publicId = `seed/${slug}`;
      const image = await prisma.productImage.findFirst({
        where: { productId: product.id, publicId },
      });
      if (!image) {
        await prisma.productImage.create({
          data: {
            id: generateUuidV7(),
            productId: product.id,
            publicId,
            url: `https://placehold.co/800x800/png?text=${encodeURIComponent(categories[categoryIndex][0])}`,
            isPrimary: true,
            sortOrder: 0,
          },
        });
      }
    }
  }
  const coupons = [
    {
      code: 'SALE10',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10,
      maxDiscount: null,
      minOrderAmount: 100000,
      maxUsage: 100,
    },
    {
      code: 'GIAM50K',
      discountType: DiscountType.FIXED_AMOUNT,
      discountValue: 50000,
      maxDiscount: null,
      minOrderAmount: 200000,
      maxUsage: 50,
    },
  ] as const;
  for (const coupon of coupons) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      create: { id: generateUuidV7(), ...coupon, isActive: true },
      update: { ...coupon, isActive: true, deletedAt: null },
    });
  }
}

async function seedDevelopmentFixtures() {
  if (process.env.NODE_ENV !== 'development') return;
  const [admin, customer] = await Promise.all([
    prisma.role.findUniqueOrThrow({ where: { name: ROLE.ADMIN } }),
    prisma.role.findUniqueOrThrow({ where: { name: ROLE.CUSTOMER } }),
  ]);
  await seedDevelopmentUser({
    email: 'admin@shop.local',
    password: 'Admin@123',
    firstName: 'Shop',
    lastName: 'Admin',
    roleId: admin.id,
  });
  await seedDevelopmentUser({
    email: 'customer@shop.local',
    password: 'Customer@123',
    firstName: 'Demo',
    lastName: 'Customer',
    roleId: customer.id,
  });
  await seedDevelopmentCatalog();
}

async function main() {
  console.log('🌱 Starting Prisma seed...');
  await seedRolesAndPermissions();
  await seedDevelopmentFixtures();
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
