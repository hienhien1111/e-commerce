import { Test, TestingModule } from '@nestjs/testing';
import { GetCurrenciesHandler } from './get-currencies.handler';
import { GetCurrenciesQuery } from './get-currencies.query';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';

describe('GetCurrenciesHandler', () => {
  let handler: GetCurrenciesHandler;
  let transfiApi: jest.Mocked<{ getCurrencies: jest.Mock }>;

  const mockCurrencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'VND', name: 'Vietnamese Dong' },
  ];

  beforeEach(async () => {
    transfiApi = { getCurrencies: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCurrenciesHandler,
        { provide: TRANSFI_API_PORT, useValue: transfiApi },
      ],
    }).compile();

    handler = module.get<GetCurrenciesHandler>(GetCurrenciesHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return currencies with direction filter', async () => {
      transfiApi.getCurrencies.mockResolvedValue(mockCurrencies);

      const query = new GetCurrenciesQuery('deposit', 1, 10);

      const result = await handler.execute(query);

      expect(transfiApi.getCurrencies).toHaveBeenCalledWith('deposit', 1, 10);
      expect(result).toEqual(mockCurrencies);
    });

    it('should pass pagination parameters', async () => {
      transfiApi.getCurrencies.mockResolvedValue(mockCurrencies);

      const query = new GetCurrenciesQuery('withdraw', 2, 20);

      await handler.execute(query);

      expect(transfiApi.getCurrencies).toHaveBeenCalledWith('withdraw', 2, 20);
    });
  });
});
