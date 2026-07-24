import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { INestApplication } from '@nestjs/common';

export async function waitFor<T>(
  read: () => Promise<T>,
  predicate: (value: T) => boolean,
  timeoutMs = 10_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!predicate(value) && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    value = await read();
  }
  if (!predicate(value)) {
    throw new Error(`Timed out waiting for asynchronous commerce state`);
  }
  return value;
}

/**
 * Cleans mutable E2E data while preserving seeded roles and permissions.
 * Order matters — child records must be deleted before their parents.
 */
export async function cleanDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);

  await prisma.$transaction([
    prisma.outboxMessage.deleteMany(),
    prisma.inventoryMovement.deleteMany(),
    prisma.inventoryReservation.deleteMany(),
    prisma.inventoryBalance.deleteMany(),
    prisma.couponUsage.deleteMany(),
    prisma.paymentRefund.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.productVariantMedia.deleteMany(),
    prisma.productVariantOptionValue.deleteMany(),
    prisma.productOptionValue.deleteMany(),
    prisma.productOption.deleteMany(),
    prisma.productCatalogProjection.deleteMany(),
    prisma.productMedia.deleteMany(),
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
    prisma.outboxMessage.deleteMany(),
    prisma.inventoryMovement.deleteMany({ where: { orderId: { not: null } } }),
    prisma.inventoryReservation.deleteMany({
      where: { orderId: { not: null } },
    }),
    prisma.couponUsage.deleteMany(),
    prisma.paymentRefund.deleteMany(),
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
