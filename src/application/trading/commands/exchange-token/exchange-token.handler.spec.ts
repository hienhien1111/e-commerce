import { Test, TestingModule } from '@nestjs/testing';
import { ExchangeTokenHandler } from './exchange-token.handler';
import { ExchangeTokenCommand } from './exchange-token.command';
import { ALPACA_API_PORT } from '../../ports/alpaca-api.port';
import { ALPACA_TOKEN_REPOSITORY } from '../../ports/alpaca-token.repository';

describe('ExchangeTokenHandler', () => {
  let handler: ExchangeTokenHandler;
  let alpacaApi: jest.Mocked<{
    exchangeCodeForToken: jest.Mock;
    getAccount: jest.Mock;
  }>;
  let tokenRepository: jest.Mocked<{ save: jest.Mock }>;

  const mockTokenResponse = {
    access_token: 'access-token-123',
    token_type: 'Bearer',
    scope: 'account:write trading',
  };

  const mockAccount = {
    id: 'account-123',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    alpacaApi = {
      exchangeCodeForToken: jest.fn(),
      getAccount: jest.fn(),
    };
    tokenRepository = { save: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExchangeTokenHandler,
        { provide: ALPACA_API_PORT, useValue: alpacaApi },
        { provide: ALPACA_TOKEN_REPOSITORY, useValue: tokenRepository },
      ],
    }).compile();

    handler = module.get<ExchangeTokenHandler>(ExchangeTokenHandler);
  });

  it('should be defined', () => {
    expect(handler).toBeDefined();
  });

  describe('execute', () => {
    beforeEach(() => {
      alpacaApi.exchangeCodeForToken.mockResolvedValue(mockTokenResponse);
      alpacaApi.getAccount.mockResolvedValue(mockAccount);
      tokenRepository.save.mockResolvedValue(undefined);
    });

    it('should exchange code for token', async () => {
      const command = new ExchangeTokenCommand('auth-code-123', 'user-123');

      await handler.execute(command);

      expect(alpacaApi.exchangeCodeForToken).toHaveBeenCalledWith(
        'auth-code-123',
      );
    });

    it('should fetch account info with access token', async () => {
      const command = new ExchangeTokenCommand('auth-code-123', 'user-123');

      await handler.execute(command);

      expect(alpacaApi.getAccount).toHaveBeenCalledWith('access-token-123');
    });

    it('should save trading token', async () => {
      const command = new ExchangeTokenCommand('auth-code-123', 'user-123');

      await handler.execute(command);

      expect(tokenRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'access-token-123',
          userId: 'user-123',
          accountId: 'account-123',
        }),
      );
    });
  });
});
