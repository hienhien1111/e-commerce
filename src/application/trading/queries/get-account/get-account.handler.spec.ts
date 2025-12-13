import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetAccountHandler } from './get-account.handler';
import { GetAccountQuery } from './get-account.query';
import { ALPACA_API_PORT } from '../../ports/alpaca-api.port';
import { ALPACA_TOKEN_REPOSITORY } from '../../ports/alpaca-token.repository';
import { TradingToken } from '@/domain/entities/trading-token';

describe('GetAccountHandler', () => {
  let handler: GetAccountHandler;
  let alpacaApi: jest.Mocked<{ getAccount: jest.Mock }>;
  let tokenRepository: jest.Mocked<{ findByUserId: jest.Mock }>;

  const mockToken = {
    id: 'token-123',
    userId: 'user-123',
    accessToken: 'access-token-123',
  } as TradingToken;

  const mockAccount = {
    id: 'account-123',
    status: 'ACTIVE',
    currency: 'USD',
    cash: '10000.00',
  };

  beforeEach(async () => {
    alpacaApi = { getAccount: jest.fn() };
    tokenRepository = { findByUserId: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAccountHandler,
        { provide: ALPACA_API_PORT, useValue: alpacaApi },
        { provide: ALPACA_TOKEN_REPOSITORY, useValue: tokenRepository },
      ],
    }).compile();

    handler = module.get<GetAccountHandler>(GetAccountHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    it('should throw NotFoundException if token not found', async () => {
      tokenRepository.findByUserId.mockResolvedValue(null);

      const query = new GetAccountQuery('user-123');

      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });

    it('should return account data', async () => {
      tokenRepository.findByUserId.mockResolvedValue(mockToken);
      alpacaApi.getAccount.mockResolvedValue(mockAccount);

      const query = new GetAccountQuery('user-123');

      const result = await handler.execute(query);

      expect(tokenRepository.findByUserId).toHaveBeenCalledWith('user-123');
      expect(alpacaApi.getAccount).toHaveBeenCalledWith('access-token-123');
      expect(result).toEqual(mockAccount);
    });
  });
});
