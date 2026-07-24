import { HttpResponse, http } from 'msw';
import { server } from '@/test/server';
import { ApiError, api, getValidationError } from './api';

describe('api client', () => {
  it('preserves stable commerce error codes in ApiError.data', async () => {
    server.use(
      http.post('http://localhost:3002/api/v1/orders', () =>
        HttpResponse.json(
          {
            statusCode: 422,
            code: 'RESERVATION_FAILED',
            message: 'Không thể giữ tồn kho.',
            retryable: false,
            details: { orderId: 'order-1' },
          },
          { status: 422 },
        ),
      ),
    );

    await expect(api.post('v1/orders', {})).rejects.toMatchObject<
      Partial<ApiError>
    >({
      status: 422,
      message: 'Không thể giữ tồn kho.',
      data: expect.objectContaining({
        code: 'RESERVATION_FAILED',
        details: { orderId: 'order-1' },
      }),
    });
  });

  it('supports JSON, text, no-content and multipart responses', async () => {
    const seenContentTypes: Array<string | null> = [];
    server.use(
      http.get('http://localhost:3002/api/v1/json', () =>
        HttpResponse.json({ ok: true }),
      ),
      http.get(
        'http://localhost:3002/api/v1/text',
        () => new HttpResponse('ok'),
      ),
      http.delete(
        'http://localhost:3002/api/v1/empty',
        () => new HttpResponse(null, { status: 204 }),
      ),
      http.post('http://localhost:3002/api/v1/upload', ({ request }) => {
        seenContentTypes.push(request.headers.get('content-type'));
        return HttpResponse.json({ uploaded: true });
      }),
    );

    await expect(api.get('v1/json')).resolves.toEqual({ ok: true });
    await expect(api.get('v1/text')).resolves.toBe('ok');
    await expect(api.delete('v1/empty')).resolves.toBeUndefined();
    const data = new FormData();
    data.set('file', new Blob(['image']), 'image.png');
    await expect(api.upload('v1/upload', data)).resolves.toEqual({
      uploaded: true,
    });
    expect(seenContentTypes[0]).toContain('multipart/form-data');
  });

  it('refreshes an expired cookie once and retries the original request', async () => {
    let calls = 0;
    server.use(
      http.get('http://localhost:3002/api/v1/protected', () => {
        calls += 1;
        return calls === 1
          ? HttpResponse.json({ message: 'expired' }, { status: 401 })
          : HttpResponse.json({ ok: true });
      }),
      http.post('http://localhost:3002/api/v1/refresh', () =>
        HttpResponse.json({ ok: true }),
      ),
    );

    await expect(api.get('v1/protected')).resolves.toEqual({ ok: true });
    expect(calls).toBe(2);
  });

  it('notifies the session provider when refresh fails', async () => {
    const unauthorized = vi.fn();
    window.addEventListener('auth:expired', unauthorized);
    server.use(
      http.get('http://localhost:3002/api/v1/protected', () =>
        HttpResponse.json({ message: 'expired' }, { status: 401 }),
      ),
      http.post('http://localhost:3002/api/v1/refresh', () =>
        HttpResponse.json({}, { status: 401 }),
      ),
    );

    await expect(api.get('v1/protected')).rejects.toMatchObject({
      status: 401,
      message: 'Unauthorized',
    });
    expect(unauthorized).toHaveBeenCalledTimes(1);
    window.removeEventListener('auth:expired', unauthorized);
  });

  it('extracts field validation errors without trusting malformed payloads', () => {
    expect(getValidationError(new Error('nope'), 'email')).toBeUndefined();
    expect(
      getValidationError(new ApiError(422, 'invalid', null), 'email'),
    ).toBeUndefined();
    expect(
      getValidationError(
        new ApiError(422, 'invalid', { errors: null }),
        'email',
      ),
    ).toBeUndefined();
    expect(
      getValidationError(
        new ApiError(422, 'invalid', {
          errors: { email: 'Email không hợp lệ', phone: 123 },
        }),
        'email',
      ),
    ).toBe('Email không hợp lệ');
    expect(
      getValidationError(
        new ApiError(422, 'invalid', {
          errors: { phone: 123 },
        }),
        'phone',
      ),
    ).toBeUndefined();
  });

  it('normalizes nested and non-JSON server errors', async () => {
    server.use(
      http.patch('http://localhost:3002/api/v1/nested', () =>
        HttpResponse.json(
          { message: { message: 'Nested failure' } },
          { status: 409 },
        ),
      ),
      http.put(
        'http://localhost:3002/api/v1/plain',
        () => new HttpResponse('down', { status: 500 }),
      ),
    );

    await expect(api.patch('/v1/nested', { ok: false })).rejects.toMatchObject({
      status: 409,
      message: 'Nested failure',
    });
    await expect(api.put('v1/plain', {})).rejects.toMatchObject({
      status: 500,
      message: 'HTTP 500',
    });
  });

  it('does not refresh public requests and handles a refresh network error', async () => {
    const unauthorized = vi.fn();
    window.addEventListener('auth:expired', unauthorized);
    server.use(
      http.get('http://localhost:3002/api/v1/public', () =>
        HttpResponse.json({ message: 'No access' }, { status: 401 }),
      ),
      http.get('http://localhost:3002/api/v1/network-refresh', () =>
        HttpResponse.json({ message: 'expired' }, { status: 401 }),
      ),
      http.post('http://localhost:3002/api/v1/refresh', () =>
        HttpResponse.error(),
      ),
    );

    await expect(
      api.get('v1/public', { skipAuth: true }),
    ).rejects.toMatchObject({ status: 401, message: 'No access' });
    expect(unauthorized).not.toHaveBeenCalled();
    await expect(api.get('v1/network-refresh')).rejects.toMatchObject({
      status: 401,
    });
    expect(unauthorized).toHaveBeenCalledTimes(1);
    window.removeEventListener('auth:expired', unauthorized);
  });
});
