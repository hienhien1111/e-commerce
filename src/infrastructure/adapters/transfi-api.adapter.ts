import { Injectable } from '@nestjs/common';
import type { TransfiApiPort } from '@/application/payment/ports/transfi-api.port';
import { TransfiHttpAdapter } from './transfi-http.adapter';
import {
  ListCurrenciesResponseDto,
  ListPaymentMethodsResponseDto,
  ListTokensResponseDto,
} from '@/infrastructure/dto/configuration.dto';
import {
  GetExchangeRateDto,
  ExchangeRateResponseDto,
} from '@/infrastructure/dto/exchange-rate.dto';
import {
  CreateIndividualUserDto,
  CreateBusinessUserDto,
  UserResponseDto,
  ListUsersResponseDto,
} from '@/infrastructure/dto/user.dto';
import {
  SubmitKycDto,
  SubmitKybDto,
  KycStatusResponseDto,
  ShareKycDto,
} from '@/infrastructure/dto/kyc.dto';
import {
  CreatePayinOrderDto,
  CreatePayinWithWalletDto,
  CreatePayoutOrderDto,
  CreateCryptoPayinOrderDto,
  CreateCryptoPayoutOrderDto,
  OrderResponseDto,
  ListOrdersResponseDto,
} from '@/infrastructure/dto/order.dto';
import {
  GetBalanceResponseDto,
  CreateCryptoPrefundDto,
  CreateFiatPrefundDto,
  PrefundResponseDto,
  CreateSandboxPrefundDto,
} from '@/infrastructure/dto/balance.dto';

@Injectable()
export class TransfiApiAdapter implements TransfiApiPort {
  constructor(private readonly httpAdapter: TransfiHttpAdapter) {}

  async getCurrencies(
    direction: 'deposit' | 'withdraw',
    page?: number,
    limit?: number,
  ): Promise<ListCurrenciesResponseDto> {
    const params = new URLSearchParams({
      direction,
    });
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());

    return this.httpAdapter.get<ListCurrenciesResponseDto>(
      `/currencies?${params.toString()}`,
    );
  }

  async getPaymentMethods(
    currency: string,
    direction: 'deposit' | 'withdraw',
    page?: number,
    limit?: number,
    logoFormat?: string,
  ): Promise<ListPaymentMethodsResponseDto> {
    const params = new URLSearchParams({
      currency,
      direction,
    });
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    if (logoFormat) params.append('logoFormat', logoFormat);

    return this.httpAdapter.get<ListPaymentMethodsResponseDto>(
      `/payment-methods?${params.toString()}`,
    );
  }

  async getTokens(
    direction: 'deposit' | 'withdraw',
  ): Promise<ListTokensResponseDto> {
    const params = new URLSearchParams({ direction });
    return this.httpAdapter.get<ListTokensResponseDto>(
      `/tokens?${params.toString()}`,
    );
  }

  async getExchangeRate(
    dto: GetExchangeRateDto,
  ): Promise<ExchangeRateResponseDto> {
    return this.httpAdapter.post<ExchangeRateResponseDto>(
      '/exchange-rate',
      dto,
    );
  }

  async getOnrampRate(
    dto: GetExchangeRateDto,
  ): Promise<ExchangeRateResponseDto> {
    return this.httpAdapter.post<ExchangeRateResponseDto>(
      '/exchange-rate/onramp',
      dto,
    );
  }

  async getOfframpRate(
    dto: GetExchangeRateDto,
  ): Promise<ExchangeRateResponseDto> {
    return this.httpAdapter.post<ExchangeRateResponseDto>(
      '/exchange-rate/offramp',
      dto,
    );
  }

  async getGamingRate(
    dto: GetExchangeRateDto,
  ): Promise<ExchangeRateResponseDto> {
    return this.httpAdapter.post<ExchangeRateResponseDto>(
      '/exchange-rate/gaming',
      dto,
    );
  }

  async getPayinRate(
    amount: number,
    currency: string,
    paymentCode: string,
    direction: 'forward' | 'reverse',
    balanceCurrency: string,
  ): Promise<ExchangeRateResponseDto> {
    return this.httpAdapter.post<ExchangeRateResponseDto>(
      '/exchange-rate/payin',
      {
        amount,
        currency,
        paymentCode,
        direction,
        balanceCurrency,
      },
    );
  }

  async getPayoutRate(
    amount: number,
    currency: string,
    paymentCode: string,
    direction: 'forward' | 'reverse',
    balanceCurrency: string,
  ): Promise<ExchangeRateResponseDto> {
    return this.httpAdapter.post<ExchangeRateResponseDto>(
      '/exchange-rate/payout',
      {
        amount,
        currency,
        paymentCode,
        direction,
        balanceCurrency,
      },
    );
  }

  async createIndividualUser(
    dto: CreateIndividualUserDto,
  ): Promise<UserResponseDto> {
    return this.httpAdapter.post<UserResponseDto>('/users/individual', dto);
  }

  async createBusinessUser(
    dto: CreateBusinessUserDto,
  ): Promise<UserResponseDto> {
    return this.httpAdapter.post<UserResponseDto>('/users/business', dto);
  }

  async listIndividualUsers(
    page?: number,
    limit?: number,
  ): Promise<ListUsersResponseDto> {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());

    return this.httpAdapter.get<ListUsersResponseDto>(
      `/users/individual?${params.toString()}`,
    );
  }

  async listBusinessUsers(
    page?: number,
    limit?: number,
  ): Promise<ListUsersResponseDto> {
    const params = new URLSearchParams();
    if (page !== undefined) params.append('page', page.toString());
    if (limit !== undefined) params.append('limit', limit.toString());

    return this.httpAdapter.get<ListUsersResponseDto>(
      `/users/business?${params.toString()}`,
    );
  }

  async submitKyc(dto: SubmitKycDto): Promise<KycStatusResponseDto> {
    return this.httpAdapter.post<KycStatusResponseDto>('/kyc', dto);
  }

  async submitAdvancedKyc(dto: SubmitKycDto): Promise<KycStatusResponseDto> {
    return this.httpAdapter.post<KycStatusResponseDto>('/kyc/advanced', dto);
  }

  async submitKyb(dto: SubmitKybDto): Promise<KycStatusResponseDto> {
    return this.httpAdapter.post<KycStatusResponseDto>('/kyb', dto);
  }

  async getKycStatus(transfiUserId: string): Promise<KycStatusResponseDto> {
    return this.httpAdapter.get<KycStatusResponseDto>(`/kyc/${transfiUserId}`);
  }

  async getKybStatus(transfiUserId: string): Promise<KycStatusResponseDto> {
    return this.httpAdapter.get<KycStatusResponseDto>(`/kyb/${transfiUserId}`);
  }

  async shareKycWithToken(dto: ShareKycDto): Promise<{ success: boolean }> {
    return this.httpAdapter.post<{ success: boolean }>(
      '/kyc/share/with-token',
      dto,
    );
  }

  async shareKycWithoutToken(dto: ShareKycDto): Promise<{ success: boolean }> {
    return this.httpAdapter.post<{ success: boolean }>(
      '/kyc/share/without-token',
      dto,
    );
  }

  async createPayinOrder(dto: CreatePayinOrderDto): Promise<OrderResponseDto> {
    return this.httpAdapter.post<OrderResponseDto>('/orders/payin', dto);
  }

  async createPayinWithWallet(
    dto: CreatePayinWithWalletDto,
  ): Promise<OrderResponseDto> {
    return this.httpAdapter.post<OrderResponseDto>('/orders/payin/wallet', dto);
  }

  async createPayoutOrder(
    dto: CreatePayoutOrderDto,
  ): Promise<OrderResponseDto> {
    return this.httpAdapter.post<OrderResponseDto>('/orders/payout', dto);
  }

  async listOrders(limit?: number): Promise<ListOrdersResponseDto> {
    const params = new URLSearchParams();
    if (limit !== undefined) params.append('limit', limit.toString());

    return this.httpAdapter.get<ListOrdersResponseDto>(
      `/orders?${params.toString()}`,
    );
  }

  async getOrderDetails(orderId: string): Promise<OrderResponseDto> {
    return this.httpAdapter.get<OrderResponseDto>(`/orders/${orderId}`);
  }

  async createCryptoPayinOrder(
    dto: CreateCryptoPayinOrderDto,
  ): Promise<OrderResponseDto> {
    return this.httpAdapter.post<OrderResponseDto>('/orders/crypto/payin', dto);
  }

  async createCryptoPayoutOrder(
    dto: CreateCryptoPayoutOrderDto,
  ): Promise<OrderResponseDto> {
    return this.httpAdapter.post<OrderResponseDto>(
      '/orders/crypto/payout',
      dto,
    );
  }

  async getBalance(): Promise<GetBalanceResponseDto> {
    return this.httpAdapter.get<GetBalanceResponseDto>('/balance');
  }

  async createCryptoPrefund(
    dto: CreateCryptoPrefundDto,
  ): Promise<PrefundResponseDto> {
    return this.httpAdapter.post<PrefundResponseDto>('/prefund/crypto', dto);
  }

  async createFiatPrefund(
    dto: CreateFiatPrefundDto,
  ): Promise<PrefundResponseDto> {
    return this.httpAdapter.post<PrefundResponseDto>('/prefund/fiat', dto);
  }

  async createSandboxPrefund(
    dto: CreateSandboxPrefundDto,
  ): Promise<PrefundResponseDto> {
    return this.httpAdapter.post<PrefundResponseDto>('/prefund/sandbox', dto);
  }
}
