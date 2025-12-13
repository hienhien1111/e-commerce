import { PositionDto } from '@/infrastructure/dto/position.dto';
import { AccountDto } from '@/infrastructure/dto/account.dto';
import {
  AuthUrlResponseDto,
  TokenResponseDto,
} from '@/infrastructure/dto/auth.dto';

/**
 * Port interface for Alpaca API client adapter
 */
export interface AlpacaApiPort {
  // Auth endpoints
  getAuthUrl(): AuthUrlResponseDto;
  exchangeCodeForToken(code: string): Promise<TokenResponseDto>;

  // Position endpoints
  getPositions(accessToken: string): Promise<PositionDto[]>;
  getPositionBySymbol(
    accessToken: string,
    symbol: string,
  ): Promise<PositionDto>;

  // Account endpoint
  getAccount(accessToken: string): Promise<AccountDto>;
}

export const ALPACA_API_PORT = Symbol('ALPACA_API_PORT');
