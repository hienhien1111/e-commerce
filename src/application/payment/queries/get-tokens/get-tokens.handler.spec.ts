import { Test, TestingModule } from '@nestjs/testing';
import { GetTokensHandler } from './get-tokens.handler';
import { GetTokensQuery } from './get-tokens.query';
import { TRANSFI_API_PORT } from '../../ports/transfi-api.port';

describe('GetTokensHandler', () => {
  let handler: GetTokensHandler;
  let transfiApi: jest.Mocked<{ getTokens: jest.Mock }>;

  const mockTokens = [
    { symbol: 'USDT', name: 'Tether USD' },
    { symbol: 'USDC', name: 'USD Coin' },
  ];

  beforeEach(async () => {
    transfiApi = { getTokens: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTokensHandler,
        { provide: TRANSFI_API_PORT, useValue: transfiApi },
      ],
    }).compile();

    handler = module.get<GetTokensHandler>(GetTokensHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return tokens with pagination', async () => {
      transfiApi.getTokens.mockResolvedValue(mockTokens);

      const query = new GetTokensQuery('deposit');

      const result = await handler.execute(query);

      expect(transfiApi.getTokens).toHaveBeenCalledWith('deposit');
      expect(result).toEqual(mockTokens);
    });
  });
});
