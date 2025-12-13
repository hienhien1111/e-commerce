import { Test, TestingModule } from '@nestjs/testing';
import { GetAuthUrlHandler } from './get-auth-url.handler';
import { GetAuthUrlQuery } from './get-auth-url.query';
import { ALPACA_API_PORT } from '../../ports/alpaca-api.port';

describe('GetAuthUrlHandler', () => {
  let handler: GetAuthUrlHandler;
  let alpacaApi: jest.Mocked<{ getAuthUrl: jest.Mock }>;

  const mockAuthUrl =
    'https://app.alpaca.markets/oauth/authorize?client_id=xxx';

  beforeEach(async () => {
    alpacaApi = { getAuthUrl: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAuthUrlHandler,
        { provide: ALPACA_API_PORT, useValue: alpacaApi },
      ],
    }).compile();

    handler = module.get<GetAuthUrlHandler>(GetAuthUrlHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should return auth url from alpaca api', async () => {
      alpacaApi.getAuthUrl.mockResolvedValue(mockAuthUrl);

      const query = new GetAuthUrlQuery();

      const result = await handler.execute(query);

      expect(alpacaApi.getAuthUrl).toHaveBeenCalled();
      expect(result).toEqual(mockAuthUrl);
    });
  });
});
