import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetPositionsHandler } from './get-positions.handler';
import { GetPositionsQuery } from './get-positions.query';
import { ALPACA_API_PORT } from '../../ports/alpaca-api.port';
import { ALPACA_TOKEN_REPOSITORY } from '../../ports/alpaca-token.repository';
import { TradingToken } from '@/domain/entities/trading-token';

describe('GetPositionsHandler', () => {
  let handler: GetPositionsHandler;
  let alpacaApi: jest.Mocked<{ getPositions: jest.Mock }>;
  let tokenRepository: jest.Mocked<{ findByUserId: jest.Mock }>;

  const mockToken = {
    id: 'token-123',
    userId: 'user-123',
    accessToken: 'access-token-123',
  } as TradingToken;

  const mockPositions = [
    { symbol: 'AAPL', qty: '10', avg_entry_price: '150.00' },
    { symbol: 'GOOGL', qty: '5', avg_entry_price: '2800.00' },
  ];

  beforeEach(async () => {
    alpacaApi = { getPositions: jest.fn() };
    tokenRepository = { findByUserId: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetPositionsHandler,
        { provide: ALPACA_API_PORT, useValue: alpacaApi },
        { provide: ALPACA_TOKEN_REPOSITORY, useValue: tokenRepository },
      ],
    }).compile();

    handler = module.get<GetPositionsHandler>(GetPositionsHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should throw NotFoundException if token not found', async () => {
      tokenRepository.findByUserId.mockResolvedValue(null);

      const query = new GetPositionsQuery('user-123');

      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });

    it('should return positions', async () => {
      tokenRepository.findByUserId.mockResolvedValue(mockToken);
      alpacaApi.getPositions.mockResolvedValue(mockPositions);

      const query = new GetPositionsQuery('user-123');

      const result = await handler.execute(query);

      expect(tokenRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(alpacaApi.getPositions).toHaveBeenCalledWith('access-token-123');
      expect(result).toEqual(mockPositions);
    });
  });
});
