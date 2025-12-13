import { Test, TestingModule } from '@nestjs/testing';
import { GetExchangeRateHandler } from './get-exchange-rate.handler';
import { GetExchangeRateQuery } from './get-exchange-rate.query';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';

describe('GetExchangeRateHandler', () => {
  let handler: GetExchangeRateHandler;
  let transfiApi: jest.Mocked<{ getExchangeRate: jest.Mock }>;

  const mockExchangeRate = {
    rate: 24500,
    sourceCurrency: 'USD',
    destinationCurrency: 'VND',
  };

  beforeEach(async () => {
    transfiApi = { getExchangeRate: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetExchangeRateHandler,
        { provide: TRANSFI_API_PORT, useValue: transfiApi },
      ],
    }).compile();

    handler = module.get<GetExchangeRateHandler>(GetExchangeRateHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return exchange rate', async () => {
      transfiApi.getExchangeRate.mockResolvedValue(mockExchangeRate);

      const dto = {
        sourceCurrency: 'USD',
        destinationCurrency: 'VND',
        amount: 100,
      };
      const query = new GetExchangeRateQuery(dto);

      const result = await handler.execute(query);

      expect(transfiApi.getExchangeRate).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockExchangeRate);
    });
  });
});
