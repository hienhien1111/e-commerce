import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type {
  MomoGatewaySession,
  MomoInitiationInput,
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

const value = (input: string | number): string => String(input);

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
      throw new ServiceUnavailableException('MoMo payment is not configured');
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
      throw new ServiceUnavailableException('MoMo payment is unavailable');
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
}
