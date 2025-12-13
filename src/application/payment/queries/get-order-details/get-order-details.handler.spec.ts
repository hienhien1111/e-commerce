import { Test, TestingModule } from '@nestjs/testing';
import { GetOrderDetailsHandler } from './get-order-details.handler';
import { GetOrderDetailsQuery } from './get-order-details.query';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';
import { TRANSFI_ORDER_REPOSITORY_PORT } from '../../ports/transfi-order-repository.port';

describe('GetOrderDetailsHandler', () => {
  let handler: GetOrderDetailsHandler;
  let transfiApi: jest.Mocked<{ getOrderDetails: jest.Mock }>;
  let orderRepository: jest.Mocked<{
    findByOrderId: jest.Mock;
    update: jest.Mock;
  }>;

  const mockOrderDetails = {
    orderId: 'order-123',
    status: 'completed',
    amount: 100,
    currency: 'USD',
  };

  beforeEach(async () => {
    transfiApi = { getOrderDetails: jest.fn() };
    orderRepository = {
      findByOrderId: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetOrderDetailsHandler,
        { provide: TRANSFI_API_PORT, useValue: transfiApi },
        { provide: TRANSFI_ORDER_REPOSITORY_PORT, useValue: orderRepository },
      ],
    }).compile();

    handler = module.get<GetOrderDetailsHandler>(GetOrderDetailsHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return order details and update status if local order exists', async () => {
      transfiApi.getOrderDetails.mockResolvedValue(mockOrderDetails);
      orderRepository.findByOrderId.mockResolvedValue({
        id: 'local-order-123',
        orderId: 'order-123',
      });
      orderRepository.update.mockResolvedValue(undefined);

      const query = new GetOrderDetailsQuery('order-123');

      const result = await handler.execute(query);

      expect(transfiApi.getOrderDetails).toHaveBeenCalledWith('order-123');
      expect(orderRepository.findByOrderId).toHaveBeenCalledWith('order-123');
      expect(result).toEqual(mockOrderDetails);
    });

    it('should return order details without updating if local order not found', async () => {
      transfiApi.getOrderDetails.mockResolvedValue(mockOrderDetails);
      orderRepository.findByOrderId.mockResolvedValue(null);

      const query = new GetOrderDetailsQuery('order-123');

      const result = await handler.execute(query);

      expect(orderRepository.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockOrderDetails);
    });
  });
});
