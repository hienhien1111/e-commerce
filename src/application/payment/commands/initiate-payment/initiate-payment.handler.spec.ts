import { toMomoProviderFailure } from './initiate-payment.handler';

describe('toMomoProviderFailure', () => {
  it('turns a provider signature response into a safe configuration error', () => {
    const failure = toMomoProviderFailure(
      13,
      'Chữ ký không hợp lệ. raw=accessKey=private-value&secret=private-value',
    );

    expect(failure).toEqual({
      code: 'MOMO_SIGNATURE_INVALID',
      retryable: false,
      message:
        'MoMo không xác thực được chữ ký. Kiểm tra Partner Code, Access Key và Secret Key của cùng một môi trường Sandbox.',
    });
    expect(failure.message).not.toContain('private-value');
  });

  it('keeps other provider errors retryable without returning raw gateway data', () => {
    expect(toMomoProviderFailure(1006, 'Payment declined')).toEqual({
      code: 'MOMO_PROVIDER_REJECTED',
      retryable: true,
      message: 'MoMo từ chối tạo phiên thanh toán (mã 1006).',
    });
  });
});
