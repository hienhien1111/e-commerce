import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError, AxiosRequestConfig } from 'axios';

@Injectable()
export class TransfiHttpAdapter {
  private readonly logger = new Logger(TransfiHttpAdapter.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('transfi.baseUrl') ||
      'https://api.transfi.com';
    this.apiKey = this.configService.get<string>('transfi.apiKey') || '';
  }

  async get<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`GET ${url}`);

      const response = await firstValueFrom(
        this.httpService.get<T>(url, this.mergeConfig(config)),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`POST ${url}`);

      const response = await firstValueFrom(
        this.httpService.post<T>(url, data, this.mergeConfig(config)),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async put<T>(
    endpoint: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`PUT ${url}`);

      const response = await firstValueFrom(
        this.httpService.put<T>(url, data, this.mergeConfig(config)),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  async delete<T>(endpoint: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`DELETE ${url}`);

      const response = await firstValueFrom(
        this.httpService.delete<T>(url, this.mergeConfig(config)),
      );

      return response.data;
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  private mergeConfig(config?: AxiosRequestConfig): AxiosRequestConfig {
    const defaultConfig: AxiosRequestConfig = {
      headers: {
        'X-API-Key': this.apiKey,
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

  private handleError(error: unknown): void {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;
      const errorData = error.response?.data;

      this.logger.error(
        `Transfi API Error [${status}]: ${message}`,
        JSON.stringify(errorData, null, 2),
      );
    } else {
      this.logger.error('Unexpected error during Transfi API call', error);
    }
  }
}
