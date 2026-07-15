import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { INestApplication } from '@nestjs/common';

/**
 * Cleans mutable E2E data while preserving seeded roles and permissions.
 * Order matters — child records must be deleted before their parents.
 */
export async function cleanDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);

  await prisma.$transaction([
    prisma.couponUsage.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.product.deleteMany(),
    prisma.category.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.userAddress.deleteMany(),
    prisma.webAuthnCredential.deleteMany(),
    prisma.session.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

/**
 * Cleans user-related E2E data while keeping catalog and seed data intact.
 */
export async function cleanUserData(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);

  await prisma.$transaction([
    prisma.couponUsage.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.userAddress.deleteMany(),
    prisma.webAuthnCredential.deleteMany(),
    prisma.session.deleteMany(),
    prisma.userRole.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
