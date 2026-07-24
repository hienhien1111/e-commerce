import { ConfigService } from '@nestjs/config';
import {
  createMomoIpnSignature,
  createMomoRequestSignature,
  MomoPaymentGateway,
} from './momo-payment.gateway';

const momo = {
  partnerCode: 'MOMO_TEST',
  accessKey: 'access-key',
  secretKey: 'secret-key',
  endpoint: 'https://momo.test',
  ipnUrl: 'https://shop.test/api/v1/webhooks/momo',
  redirectUrl: 'https://shop.test/payment/return',
  paymentExpiryMinutes: 15,
};

const config = () =>
  ({
    get: jest.fn().mockReturnValue(momo),
    getOrThrow: jest.fn().mockReturnValue(momo),
  }) as unknown as ConfigService;

describe('MomoPaymentGateway', () => {
  it('creates deterministic request and IPN HMAC signatures', () => {
    expect(
      createMomoRequestSignature({
        accessKey: momo.accessKey,
        amount: 1000,
        extraData: 'eyJvcmRlcklkIjoiMSJ9',
        ipnUrl: momo.ipnUrl,
        orderId: 'momo-order-1',
        orderInfo: 'Payment',
        partnerCode: momo.partnerCode,
        redirectUrl: momo.redirectUrl,
        requestId: 'request-1',
        requestType: 'captureWallet',
        secretKey: momo.secretKey,
      }),
    ).toMatch(/^[a-f0-9]{64}$/);
    const payload = {
      partnerCode: momo.partnerCode,
      orderId: 'momo-order-1',
      requestId: 'request-1',
      amount: 1000,
      orderInfo: 'Payment',
      orderType: 'momo_wallet',
      transId: '123',
      resultCode: 0,
      message: 'Successful.',
      payType: 'qr',
      responseTime: 1_700_000_000_000,
      extraData: 'eyJvcmRlcklkIjoiMSJ9',
    };
    const signature = createMomoIpnSignature(
      payload,
      momo.secretKey,
      momo.accessKey,
    );
    const gateway = new MomoPaymentGateway(config());
    expect(gateway.verifyWebhook({ ...payload, signature })).toBe(true);
    expect(gateway.verifyWebhook({ ...payload, signature: 'forged' })).toBe(
      false,
    );
  });

  it('uses a 30-second abort signal and surfaces a provider error', async () => {
    const gateway = new MomoPaymentGateway(config());
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockRejectedValueOnce(new Error('network down'));
    await expect(
      gateway.initiate({
        providerOrderId: 'momo-order-1',
        requestId: 'request-1',
        amount: 1000,
        orderInfo: 'Payment',
        items: [],
        userInfo: { name: 'Test', phoneNumber: '0900000000', email: '' },
        deliveryInfo: {
          deliveryAddress: 'Ho Chi Minh',
          deliveryFee: '0',
          quantity: '1',
        },
        extraData: '',
        redirectUrl: momo.redirectUrl,
        ipnUrl: momo.ipnUrl,
      }),
    ).rejects.toMatchObject({
      code: 'MOMO_GATEWAY_UNAVAILABLE',
      name: 'MomoGatewayError',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://momo.test/v2/gateway/api/create',
      expect.objectContaining({
        method: 'POST',
        signal: expect.any(AbortSignal),
      }),
    );
    fetchMock.mockRestore();
  });

  it('queries prior refunds before sending an idempotent full refund request', async () => {
    const gateway = new MomoPaymentGateway(config());
    const fetchMock = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            resultCode: 0,
            message: 'Successful.',
            refundTrans: [
              { amount: 20_000, resultCode: 0 },
              { amount: 10_000, resultCode: 1002 },
            ],
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            resultCode: 0,
            message: 'Successful.',
            transId: 2_820_086_739,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    await expect(
      gateway.queryTransaction({
        providerOrderId: 'purchase-order-1',
        requestId: 'refund-request-1',
      }),
    ).resolves.toEqual({
      resultCode: 0,
      message: 'Successful.',
      refundedAmount: 20_000,
    });
    await expect(
      gateway.refund({
        providerRefundOrderId: 'refund-order-1',
        requestId: 'refund-request-1',
        amount: 100_000,
        providerTransId: '144492817',
        description: 'Hoan tien don hang order-1',
      }),
    ).resolves.toEqual({
      resultCode: 0,
      message: 'Successful.',
      refundTransId: '2820086739',
    });

    const queryCall = fetchMock.mock.calls[0];
    const refundCall = fetchMock.mock.calls[1];
    expect(queryCall[0]).toBe('https://momo.test/v2/gateway/api/query');
    expect(refundCall[0]).toBe('https://momo.test/v2/gateway/api/refund');
    const refundBody = JSON.parse(
      String((refundCall[1] as RequestInit).body),
    ) as Record<string, unknown>;
    expect(refundBody).toMatchObject({
      orderId: 'refund-order-1',
      requestId: 'refund-request-1',
      amount: 100_000,
      transId: 144492817,
    });
    expect(refundBody.signature).toMatch(/^[a-f0-9]{64}$/);
    fetchMock.mockRestore();
  });
});
