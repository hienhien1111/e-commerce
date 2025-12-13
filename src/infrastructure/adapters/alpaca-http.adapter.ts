import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';

@Injectable()
export class AlpacaHttpAdapter {
  private readonly logger = new Logger(AlpacaHttpAdapter.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('alpaca.baseUrl')!;
  }

  /**
   * Make a GET request to Alpaca API with OAuth token
   */
  async get<T>(
    endpoint: string,
    accessToken: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`GET ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<T>(url, this.mergeConfig(accessToken, config)),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Make a POST request to Alpaca API with OAuth token
   */
  async post<T>(
    endpoint: string,
    accessToken: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`POST ${url}`);

      const response = await firstValueFrom(
        this.httpService.post<T>(
          url,
          data,
          this.mergeConfig(accessToken, config),
        ),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Make a DELETE request to Alpaca API with OAuth token
   */
  async delete<T>(
    endpoint: string,
    accessToken: string,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`DELETE ${url}`);

      const response = await firstValueFrom(
        this.httpService.delete<T>(url, this.mergeConfig(accessToken, config)),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * Merge custom config with OAuth auth config
   */
  private mergeConfig(
    accessToken: string,
    config?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const defaultConfig: AxiosRequestConfig = {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    };

    return {
      ...defaultConfig,
      ...config,
      headers: {
        ...defaultConfig.headers,
        ...config?.headers,
      },
    };
  }

  /**
   * Handle and log errors from Alpaca API
   */
  private handleError(error: unknown): void {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      const errorData = error.response?.data;

      this.logger.error(
        `Alpaca API Error [${status}]: ${message}`,
        JSON.stringify(errorData, null, 2),
      );
    } else {
      this.logger.error('Unexpected error during Alpaca API call', error);
    }
  }
}
