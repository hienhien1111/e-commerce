import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  MomoGatewaySession,
  MomoInitiationInput,
  MomoRefundInput,
  MomoRefundResult,
  MomoTransactionQueryResult,
  MomoWebhookPayload,
  PaymentGatewayPort,
} from '@/application/payment/ports/payment.gateway.port';
import type { AllConfigType } from '@/config/config.type';

type MomoCreateResponse = {
  resultCode?: number;
  message?: string;
  payUrl?: string;
  qrCodeUrl?: string;
  deeplink?: string;
};

type MomoQueryResponse = {
  resultCode?: number;
  message?: string;
  refundTrans?: Array<{
    amount?: number;
    resultCode?: number;
  }>;
};

type MomoRefundResponse = {
  resultCode?: number;
  message?: string;
  transId?: string | number;
};

const value = (input: string | number): string => String(input);

export class MomoGatewayError extends Error {
  readonly code = 'MOMO_GATEWAY_UNAVAILABLE';

  constructor(message: string) {
    super(message);
    this.name = 'MomoGatewayError';
  }
}

export function createMomoRequestSignature(input: {
  accessKey: string;
  amount: number;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
  secretKey: string;
}): string {
  const raw = [
    `accessKey=${input.accessKey}`,
    `amount=${value(input.amount)}`,
    `extraData=${input.extraData}`,
    `ipnUrl=${input.ipnUrl}`,
    `orderId=${input.orderId}`,
    `orderInfo=${input.orderInfo}`,
    `partnerCode=${input.partnerCode}`,
    `redirectUrl=${input.redirectUrl}`,
    `requestId=${input.requestId}`,
    `requestType=${input.requestType}`,
  ].join('&');
  return createHmac('sha256', input.secretKey).update(raw).digest('hex');
}

export function createMomoIpnSignature(
  payload: Omit<MomoWebhookPayload, 'signature'>,
  secretKey: string,
  accessKey = '',
): string {
  const raw = [
    `accessKey=${accessKey}`,
    `amount=${value(payload.amount)}`,
    `extraData=${payload.extraData}`,
    `message=${payload.message}`,
    `orderId=${payload.orderId}`,
    `orderInfo=${payload.orderInfo}`,
    `orderType=${payload.orderType}`,
    `partnerCode=${payload.partnerCode}`,
    `payType=${payload.payType}`,
    `requestId=${payload.requestId}`,
    `responseTime=${value(payload.responseTime)}`,
    `resultCode=${value(payload.resultCode)}`,
    `transId=${payload.transId}`,
  ].join('&');
  return createHmac('sha256', secretKey).update(raw).digest('hex');
}

export function createMomoQuerySignature(input: {
  accessKey: string;
  orderId: string;
  partnerCode: string;
  requestId: string;
  secretKey: string;
}): string {
  const raw = [
    `accessKey=${input.accessKey}`,
    `orderId=${input.orderId}`,
    `partnerCode=${input.partnerCode}`,
    `requestId=${input.requestId}`,
  ].join('&');
  return createHmac('sha256', input.secretKey).update(raw).digest('hex');
}

export function createMomoRefundSignature(input: {
  accessKey: string;
  amount: number;
  description: string;
  orderId: string;
  partnerCode: string;
  requestId: string;
  secretKey: string;
  transId: string;
}): string {
  const raw = [
    `accessKey=${input.accessKey}`,
    `amount=${value(input.amount)}`,
    `description=${input.description}`,
    `orderId=${input.orderId}`,
    `partnerCode=${input.partnerCode}`,
    `requestId=${input.requestId}`,
    `transId=${input.transId}`,
  ].join('&');
  return createHmac('sha256', input.secretKey).update(raw).digest('hex');
}

@Injectable()
export class MomoPaymentGateway implements PaymentGatewayPort {
  private readonly logger = new Logger(MomoPaymentGateway.name);

  constructor(private readonly config: ConfigService<AllConfigType>) {}

  isConfigured(): boolean {
    const momo = this.config.get('momo', { infer: true });
    return Boolean(
      momo?.partnerCode &&
        momo.accessKey &&
        momo.secretKey &&
        momo.ipnUrl &&
        momo.redirectUrl,
    );
  }

  async initiate(input: MomoInitiationInput): Promise<MomoGatewaySession> {
    const momo = this.config.getOrThrow('momo', { infer: true });
    if (!this.isConfigured()) {
      throw new MomoGatewayError('MoMo payment is not configured');
    }
    const requestType = 'captureWallet';
    const signature = createMomoRequestSignature({
      accessKey: momo.accessKey!,
      amount: input.amount,
      extraData: input.extraData,
      ipnUrl: input.ipnUrl,
      orderId: input.providerOrderId,
      orderInfo: input.orderInfo,
      partnerCode: momo.partnerCode!,
      redirectUrl: input.redirectUrl,
      requestId: input.requestId,
      requestType,
      secretKey: momo.secretKey!,
    });
    const endpoint = `${momo.endpoint!.replace(/\/+$/, '')}/v2/gateway/api/create`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerCode: momo.partnerCode,
          partnerName: 'Shop',
          storeId: 'Shop',
          requestId: input.requestId,
          amount: input.amount,
          orderId: input.providerOrderId,
          orderInfo: input.orderInfo,
          redirectUrl: input.redirectUrl,
          ipnUrl: input.ipnUrl,
          lang: 'vi',
          requestType,
          autoCapture: true,
          extraData: input.extraData,
          orderGroupId: '',
          signature,
          items: input.items,
          userInfo: input.userInfo,
          deliveryInfo: input.deliveryInfo,
        }),
      });
    } catch (error) {
      this.logger.warn({ err: error }, 'MoMo initiation request failed');
      throw new MomoGatewayError('MoMo payment is unavailable');
    }
    const body = (await response
      .json()
      .catch(() => ({}))) as MomoCreateResponse;
    if (!response.ok) {
      this.logger.warn(
        { status: response.status, resultCode: body.resultCode },
        'MoMo initiation rejected',
      );
      return {
        resultCode: body.resultCode ?? -1,
        message: body.message ?? 'MoMo rejected the payment request',
        payUrl: null,
        qrCodeUrl: null,
        deeplink: null,
      };
    }
    return {
      resultCode: body.resultCode ?? -1,
      message: body.message ?? 'MoMo did not return a payment session',
      payUrl: body.payUrl ?? null,
      qrCodeUrl: body.qrCodeUrl ?? null,
      deeplink: body.deeplink ?? null,
    };
  }

  verifyWebhook(payload: MomoWebhookPayload): boolean {
    const momo = this.config.get('momo', { infer: true });
    if (!momo?.accessKey || !momo.secretKey || !momo.partnerCode) return false;
    if (payload.partnerCode !== momo.partnerCode) return false;
    const expected = createMomoIpnSignature(
      payload,
      momo.secretKey,
      momo.accessKey,
    );
    const actualBuffer = Buffer.from(payload.signature, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');
    return (
      actualBuffer.length === expectedBuffer.length &&
      timingSafeEqual(actualBuffer, expectedBuffer)
    );
  }

  async queryTransaction(input: {
    providerOrderId: string;
    requestId: string;
  }): Promise<MomoTransactionQueryResult> {
    const momo = this.config.getOrThrow('momo', { infer: true });
    this.assertConfigured();
    const signature = createMomoQuerySignature({
      accessKey: momo.accessKey!,
      orderId: input.providerOrderId,
      partnerCode: momo.partnerCode!,
      requestId: input.requestId,
      secretKey: momo.secretKey!,
    });
    const body = await this.post<MomoQueryResponse>(
      '/v2/gateway/api/query',
      {
        partnerCode: momo.partnerCode,
        requestId: input.requestId,
        orderId: input.providerOrderId,
        lang: 'vi',
        signature,
      },
      'query transaction',
    );
    return {
      resultCode: body.resultCode ?? -1,
      message: body.message ?? 'MoMo transaction query failed',
      refundedAmount: (body.refundTrans ?? [])
        .filter((item) => item.resultCode === 0)
        .reduce((total, item) => total + Number(item.amount ?? 0), 0),
    };
  }

  async refund(input: MomoRefundInput): Promise<MomoRefundResult> {
    const momo = this.config.getOrThrow('momo', { infer: true });
    this.assertConfigured();
    const signature = createMomoRefundSignature({
      accessKey: momo.accessKey!,
      amount: input.amount,
      description: input.description,
      orderId: input.providerRefundOrderId,
      partnerCode: momo.partnerCode!,
      requestId: input.requestId,
      secretKey: momo.secretKey!,
      transId: input.providerTransId,
    });
    const body = await this.post<MomoRefundResponse>(
      '/v2/gateway/api/refund',
      {
        partnerCode: momo.partnerCode,
        orderId: input.providerRefundOrderId,
        requestId: input.requestId,
        amount: input.amount,
        transId: Number(input.providerTransId),
        lang: 'vi',
        description: input.description,
        signature,
      },
      'refund',
    );
    return {
      resultCode: body.resultCode ?? -1,
      message: body.message ?? 'MoMo refund failed',
      refundTransId:
        body.transId === undefined || body.transId === null
          ? null
          : String(body.transId),
    };
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new MomoGatewayError('MoMo payment is not configured');
    }
  }

  private async post<T>(
    path: string,
    requestBody: Record<string, unknown>,
    operation: string,
  ): Promise<T> {
    const momo = this.config.getOrThrow('momo', { infer: true });
    const endpoint = `${momo.endpoint!.replace(/\/+$/, '')}${path}`;
    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      this.logger.warn({ err: error, operation }, 'MoMo request failed');
      throw new MomoGatewayError('MoMo payment is unavailable');
    }
    const body = (await response.json().catch(() => ({}))) as T;
    if (!response.ok) {
      this.logger.warn(
        { status: response.status, operation },
        'MoMo request rejected',
      );
      throw new MomoGatewayError('MoMo payment is unavailable');
    }
    return body;
  }
}
