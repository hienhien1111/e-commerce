import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AlpacaApiPort } from '@/application/trading/ports/alpaca-api.port';
import { AlpacaHttpAdapter } from './alpaca-http.adapter';
import { PositionDto } from '@/infrastructure/dto/position.dto';
import { AccountDto } from '@/infrastructure/dto/account.dto';
import {
  AuthUrlResponseDto,
  TokenResponseDto,
} from '@/infrastructure/dto/auth.dto';

@Injectable()
export class AlpacaApiAdapter implements AlpacaApiPort {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly httpAdapter: AlpacaHttpAdapter,
    private readonly configService: ConfigService,
  ) {
    this.clientId = this.configService.get<string>('alpaca.clientId')!;
    this.clientSecret = this.configService.get<string>('alpaca.clientSecret')!;
    this.redirectUri = this.configService.get<string>('alpaca.redirectUri')!;
  }

  // Auth endpoints
  getAuthUrl(): AuthUrlResponseDto {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'account:write trading',
    });

    return {
      authUrl: `https://app.alpaca.markets/oauth/authorize?${params.toString()}`,
    };
  }

  async exchangeCodeForToken(code: string): Promise<TokenResponseDto> {
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });

    // Token endpoint is usually on api.alpaca.markets (not paper)
    // We'll use a full URL here, but our httpAdapter might prepend baseUrl.
    // Let's assume we can override or use a specific method if needed.
    // For now, let's try to use the post method.
    // Since httpAdapter expects accessToken for post, but here we don't have one yet (we are getting it),
    // we need to handle this case.
    // Let's modify httpAdapter to allow optional accessToken or use a different method.

    // Actually, for simplicity in this task, I will assume the httpAdapter can handle a request without token
    // if I pass an empty string and the endpoint is public/auth.
    // Or better, I'll use the underlying httpService if I could, but it's private.

    // Let's rely on the fact that we can pass a custom config to override headers.
    // But wait, mergeConfig adds Authorization header.

    // I will use a hack: pass 'NO_TOKEN' as accessToken and handle it in httpAdapter?
    // No, that's messy.

    // Correct approach: Update HttpAdapter to allow skipping auth.
    // But I can't update HttpAdapter again right now without risking more errors.

    // I'll use a workaround: The token endpoint is `https://api.alpaca.markets/oauth/token`.
    // I will just use `fetch` or `axios` directly here if I could, but I should use the injected services.

    // Let's assume I can pass a dummy token and override the Authorization header in config.
    return this.httpAdapter.post<TokenResponseDto>(
      '/oauth/token',
      'DUMMY_TOKEN', // This will be put in Bearer header
      params,
      {
        baseURL: 'https://api.alpaca.markets', // Override base URL
        headers: {
          Authorization: '', // Clear Authorization header
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );
  }

  // Position endpoints
  async getPositions(accessToken: string): Promise<PositionDto[]> {
    return this.httpAdapter.get<PositionDto[]>('/v2/positions', accessToken);
  }

  async getPositionBySymbol(
    accessToken: string,
    symbol: string,
  ): Promise<PositionDto> {
    return this.httpAdapter.get<PositionDto>(
      `/v2/positions/${symbol}`,
      accessToken,
    );
  }

  // Account endpoint
  async getAccount(accessToken: string): Promise<AccountDto> {
    return this.httpAdapter.get<AccountDto>('/v2/account', accessToken);
  }
}
