import { TestingModule, Test } from '@nestjs/testing';
import { ORDER_CANCELLATION_PORT } from '@/application/order/ports/order-cancellation.port.token';
import { ORDER_CHECKOUT_PORT } from '@/application/order/ports/order-checkout.port.token';
import { ORDER_REPOSITORY_PORT } from '@/application/order/ports/order.repository.port.token';
import { PlaceBuyNowOrderHandler } from '@/application/order/commands/place-buy-now-order';
import { OrderModule } from '@/composition/modules/order.module';
import { PermissionsGuard } from '@/infrastructure/guards/permissions.guard';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { PrismaOrderRepository } from '@/infrastructure/persistence/repositories/prisma-order.repository';
import { PrismaOrderWorkflowAdapter } from '@/infrastructure/persistence/workflows/prisma-order-workflow.adapter';

describe('OrderModule', () => {
  let module: TestingModule;

  afterEach(async () => {
    await module?.close();
  });

  it('resolves persistence and checkout ports from their dedicated adapters', async () => {
    module = await Test.createTestingModule({ imports: [OrderModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    const repository = module.get(PrismaOrderRepository);
    const workflow = module.get(PrismaOrderWorkflowAdapter);

    expect(module.get(PlaceBuyNowOrderHandler)).toBeDefined();
    expect(module.get(ORDER_REPOSITORY_PORT)).toBe(repository);
    expect(module.get(ORDER_CHECKOUT_PORT)).toBe(workflow);
    expect(module.get(ORDER_CANCELLATION_PORT)).toBe(workflow);
  });
});
