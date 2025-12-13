import { Test, TestingModule } from '@nestjs/testing';
import { GetPaymentMethodsHandler } from './get-payment-methods.handler';
import { GetPaymentMethodsQuery } from './get-payment-methods.query';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';

describe('GetPaymentMethodsHandler', () => {
  let handler: GetPaymentMethodsHandler;
  let transfiApi: jest.Mocked<{ getPaymentMethods: jest.Mock }>;

  const mockPaymentMethods = [
    { id: 'bank_transfer', name: 'Bank Transfer' },
    { id: 'credit_card', name: 'Credit Card' },
  ];

  beforeEach(async () => {
    transfiApi = { getPaymentMethods: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPaymentMethodsHandler,
        { provide: TRANSFI_API_PORT, useValue: transfiApi },
      ],
    }).compile();

    handler = module.get<GetPaymentMethodsHandler>(GetPaymentMethodsHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return payment methods with all parameters', async () => {
      transfiApi.getPaymentMethods.mockResolvedValue(mockPaymentMethods);

      const query = new GetPaymentMethodsQuery('VND', 'deposit', 1, 10, 'svg');

      const result = await handler.execute(query);

      expect(transfiApi.getPaymentMethods).toHaveBeenCalledWith(
        'VND',
        'deposit',
        1,
        10,
        'svg',
      );
      expect(result).toEqual(mockPaymentMethods);
    });

    it('should pass undefined for optional parameters', async () => {
      transfiApi.getPaymentMethods.mockResolvedValue(mockPaymentMethods);

      const query = new GetPaymentMethodsQuery(
        'USD',
        'withdraw',
        undefined,
        undefined,
        undefined,
      );

      await handler.execute(query);

      expect(transfiApi.getPaymentMethods).toHaveBeenCalledWith(
        'USD',
        'withdraw',
        undefined,
        undefined,
        undefined,
      );
    });
  });
});
