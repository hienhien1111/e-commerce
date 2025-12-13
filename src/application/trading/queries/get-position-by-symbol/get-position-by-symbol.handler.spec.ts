import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetPositionBySymbolHandler } from './get-position-by-symbol.handler';
import { GetPositionBySymbolQuery } from './get-position-by-symbol.query';
import { ALPACA_API_PORT } from '../../ports/alpaca-api.port';
import { ALPACA_TOKEN_REPOSITORY } from '../../ports/alpaca-token.repository';
import { TradingToken } from '@/domain/entities/trading-token';

describe('GetPositionBySymbolHandler', () => {
  let handler: GetPositionBySymbolHandler;
  let alpacaApi: jest.Mocked<{ getPositionBySymbol: jest.Mock }>;
  let tokenRepository: jest.Mocked<{ findByUserId: jest.Mock }>;

  const mockToken = {
    id: 'token-123',
    userId: 'user-123',
    accessToken: 'access-token-123',
  } as TradingToken;

  const mockPosition = {
    symbol: 'AAPL',
    qty: '10',
    avg_entry_price: '150.00',
    market_value: '1600.00',
  };

  beforeEach(async () => {
    alpacaApi = { getPositionBySymbol: jest.fn() };
    tokenRepository = { findByUserId: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPositionBySymbolHandler,
        { provide: ALPACA_API_PORT, useValue: alpacaApi },
        { provide: ALPACA_TOKEN_REPOSITORY, useValue: tokenRepository },
      ],
    }).compile();

    handler = module.get<GetPositionBySymbolHandler>(
      GetPositionBySymbolHandler,
    );
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should throw NotFoundException if token not found', async () => {
      tokenRepository.findByUserId.mockResolvedValue(null);

      const query = new GetPositionBySymbolQuery('user-123', 'AAPL');

      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });

    it('should return position for symbol', async () => {
      tokenRepository.findByUserId.mockResolvedValue(mockToken);
      alpacaApi.getPositionBySymbol.mockResolvedValue(mockPosition);

      const query = new GetPositionBySymbolQuery('user-123', 'AAPL');

      const result = await handler.execute(query);

      expect(tokenRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(alpacaApi.getPositionBySymbol).toHaveBeenCalledWith(
        'access-token-123',
        'AAPL',
      );
      expect(result).toEqual(mockPosition);
    });
  });
});
