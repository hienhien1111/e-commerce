import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { generateUuidV7 } from '../src/utils/uuid-v7';

function getArgument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index === -1 ? undefined : process.argv[index + 1];
}

const email = getArgument('email') ?? process.env.ADMIN_EMAIL;
const password = getArgument('password') ?? process.env.ADMIN_PASSWORD;

if (!email || !password) {
  throw new Error(
    'Usage: bun run admin:create -- --email admin@example.com --password <strong-password>',
  );
}

const normalizedEmail = email.trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
  throw new Error('Admin email must be a valid email address');
}

if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{10,}$/.test(password)) {
  throw new Error(
    'Admin password must be at least 10 characters and contain uppercase, lowercase, number, and symbol',
  );
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminRole = await prisma.role.findUniqueOrThrow({
    where: { name: 'admin' },
  });
  const hashedPassword = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email: normalizedEmail },
    create: {
      id: generateUuidV7(),
      email: normalizedEmail,
      password: hashedPassword,
      provider: 'email',
      socialId: null,
      firstName: 'Admin',
      lastName: 'User',
      verifiedAt: new Date(),
      roles: { create: [{ roleId: adminRole.id }] },
    },
    update: {
      password: hashedPassword,
      provider: 'email',
      socialId: null,
      verifiedAt: new Date(),
      roles: {
        deleteMany: {},
        create: [{ roleId: adminRole.id }],
      },
    },
  });
  console.log(`Admin account is ready for ${normalizedEmail}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
