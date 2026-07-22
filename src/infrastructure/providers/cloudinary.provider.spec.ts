import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { FileStorageInvalidFileError } from '@/application/shared/ports/file-storage/file-storage.port';
import { CloudinaryProvider } from './cloudinary.provider';

const config = (
  values?: Partial<Record<'cloudName' | 'apiKey' | 'apiSecret', string>>,
) =>
  ({
    get: () => ({
      cloudName: values?.cloudName ?? 'demo-cloud',
      apiKey: values?.apiKey ?? 'api-key',
      apiSecret: values?.apiSecret ?? 'api-secret',
    }),
  }) as unknown as ConfigService;

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

const signature = (params: Record<string, string>) =>
  createHash('sha1')
    .update(
      `${Object.entries(params)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join('&')}api-secret`,
    )
    .digest('hex');

describe('CloudinaryProvider', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('uploads a signed JPEG multipart request and returns only the stored asset', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve(
        response({
          secure_url:
            'https://res.cloudinary.com/demo/image/upload/products/image.jpg',
          public_id: 'products/product-1/image',
        }),
      ),
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const provider = new CloudinaryProvider(config());

    const stored = await provider.upload(
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      'products/product-1',
    );

    expect(stored).toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/products/image.jpg',
      publicId: 'products/product-1/image',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/image/upload');
    expect(options.method).toBe('POST');
    const form = options.body as FormData;
    const timestamp = form.get('timestamp');
    expect(form.get('folder')).toBe('products/product-1');
    expect(form.get('api_key')).toBe('api-key');
    expect(form.get('signature')).toBe(
      signature({ folder: 'products/product-1', timestamp: String(timestamp) }),
    );
    const file = form.get('file') as File;
    expect(file.name).toBe('upload.jpg');
    expect(file.type).toBe('image/jpeg');
  });

  it('signs delete requests with the requested public ID', async () => {
    const fetchMock = jest.fn(() =>
      Promise.resolve(response({ result: 'ok' })),
    );
    globalThis.fetch = fetchMock as typeof fetch;
    const provider = new CloudinaryProvider(config());

    await provider.delete('products/product-1/image');

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.cloudinary.com/v1_1/demo-cloud/image/destroy',
    );
    const form = options.body as FormData;
    const timestamp = String(form.get('timestamp'));
    expect(form.get('public_id')).toBe('products/product-1/image');
    expect(form.get('invalidate')).toBe('true');
    expect(form.get('signature')).toBe(
      signature({
        invalidate: 'true',
        public_id: 'products/product-1/image',
        timestamp,
      }),
    );
  });

  it('maps Cloudinary invalid-image errors to the shared storage contract', async () => {
    globalThis.fetch = jest.fn(() =>
      Promise.resolve(
        response({ error: { message: 'Invalid image file' } }, 400),
      ),
    ) as typeof fetch;
    const provider = new CloudinaryProvider(config());

    await expect(
      provider.upload(Buffer.from([0x00, 0x01]), 'products/product-1'),
    ).rejects.toBeInstanceOf(FileStorageInvalidFileError);
  });

  it('does not issue a network request when storage has no complete credentials', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as typeof fetch;
    const provider = new CloudinaryProvider(
      config({ cloudName: '', apiKey: '', apiSecret: '' }),
    );

    await expect(
      provider.upload(Buffer.from([0xff, 0xd8, 0xff]), 'avatars'),
    ).rejects.toThrow('Cloudinary is not configured');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
