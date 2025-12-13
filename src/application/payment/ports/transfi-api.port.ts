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

/**
 * Port interface for Transfi API client adapter
 */
export interface TransfiApiPort {
  // Configuration endpoints
  getCurrencies(
    direction: 'deposit' | 'withdraw',
    page?: number,
    limit?: number,
  ): Promise<ListCurrenciesResponseDto>;
  getPaymentMethods(
    currency: string,
    direction: 'deposit' | 'withdraw',
    page?: number,
    limit?: number,
    logoFormat?: string,
  ): Promise<ListPaymentMethodsResponseDto>;
  getTokens(direction: 'deposit' | 'withdraw'): Promise<ListTokensResponseDto>;

  // Exchange rate endpoints
  getExchangeRate(dto: GetExchangeRateDto): Promise<ExchangeRateResponseDto>;
  getOnrampRate(dto: GetExchangeRateDto): Promise<ExchangeRateResponseDto>;
  getOfframpRate(dto: GetExchangeRateDto): Promise<ExchangeRateResponseDto>;
  getGamingRate(dto: GetExchangeRateDto): Promise<ExchangeRateResponseDto>;
  getPayinRate(
    amount: number,
    currency: string,
    paymentCode: string,
    direction: 'forward' | 'reverse',
    balanceCurrency: string,
  ): Promise<ExchangeRateResponseDto>;
  getPayoutRate(
    amount: number,
    currency: string,
    paymentCode: string,
    direction: 'forward' | 'reverse',
    balanceCurrency: string,
  ): Promise<ExchangeRateResponseDto>;

  // User management endpoints
  createIndividualUser(dto: CreateIndividualUserDto): Promise<UserResponseDto>;
  createBusinessUser(dto: CreateBusinessUserDto): Promise<UserResponseDto>;
  listIndividualUsers(
    page?: number,
    limit?: number,
  ): Promise<ListUsersResponseDto>;
  listBusinessUsers(
    page?: number,
    limit?: number,
  ): Promise<ListUsersResponseDto>;

  // KYC/KYB endpoints
  submitKyc(dto: SubmitKycDto): Promise<KycStatusResponseDto>;
  submitAdvancedKyc(dto: SubmitKycDto): Promise<KycStatusResponseDto>;
  submitKyb(dto: SubmitKybDto): Promise<KycStatusResponseDto>;
  getKycStatus(transfiUserId: string): Promise<KycStatusResponseDto>;
  getKybStatus(transfiUserId: string): Promise<KycStatusResponseDto>;
  shareKycWithToken(dto: ShareKycDto): Promise<{ success: boolean }>;
  shareKycWithoutToken(dto: ShareKycDto): Promise<{ success: boolean }>;

  // Order endpoints - Fiat
  createPayinOrder(dto: CreatePayinOrderDto): Promise<OrderResponseDto>;
  createPayinWithWallet(
    dto: CreatePayinWithWalletDto,
  ): Promise<OrderResponseDto>;
  createPayoutOrder(dto: CreatePayoutOrderDto): Promise<OrderResponseDto>;
  listOrders(limit?: number): Promise<ListOrdersResponseDto>;
  getOrderDetails(orderId: string): Promise<OrderResponseDto>;

  // Order endpoints - Crypto
  createCryptoPayinOrder(
    dto: CreateCryptoPayinOrderDto,
  ): Promise<OrderResponseDto>;
  createCryptoPayoutOrder(
    dto: CreateCryptoPayoutOrderDto,
  ): Promise<OrderResponseDto>;

  // Balance endpoint
  getBalance(): Promise<GetBalanceResponseDto>;

  // Prefund endpoints
  createCryptoPrefund(dto: CreateCryptoPrefundDto): Promise<PrefundResponseDto>;
  createFiatPrefund(dto: CreateFiatPrefundDto): Promise<PrefundResponseDto>;

  // Sandbox only endpoints
  createSandboxPrefund(
    dto: CreateSandboxPrefundDto,
  ): Promise<PrefundResponseDto>;
}

export const TRANSFI_API_PORT = Symbol('TRANSFI_API_PORT');
