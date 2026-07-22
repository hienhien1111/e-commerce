import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AllConfigType } from '@/config/config.type';
import type {
  FileStoragePort,
  StoredFile,
} from '@/application/shared/ports/file-storage/file-storage.port';
import { FileStorageInvalidFileError } from '@/application/shared/ports/file-storage/file-storage.port';
import { getImageFileFormat } from '@/shared/utils/image-file-signature';

type CloudinaryCredentials = {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
};

type CloudinaryApiResponse = {
  secure_url?: unknown;
  public_id?: unknown;
  error?: { message?: unknown };
};

type CloudinaryApiError = Error & { http_code?: number };

const CLOUDINARY_API_BASE_URL = 'https://api.cloudinary.com/v1_1';
const CLOUDINARY_TIMEOUT_MS = 30_000;

/**
 * Cloudinary's stream SDK can send an unsigned request for some larger binary
 * payloads under Bun. File uploads are already buffered and capped by Multer,
 * so this adapter uses the signed Upload API directly for deterministic
 * multipart handling across JPEG, PNG, and WebP.
 */
@Injectable()
export class CloudinaryProvider implements FileStoragePort {
  private readonly logger = new Logger(CloudinaryProvider.name);
  private readonly credentials: CloudinaryCredentials | null;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const config = this.configService.get('cloudinary', { infer: true });
    const cloudName = config?.cloudName?.trim();
    const apiKey = config?.apiKey?.trim();
    const apiSecret = config?.apiSecret?.trim();
    this.credentials =
      cloudName && apiKey && apiSecret
        ? { cloudName, apiKey, apiSecret }
        : null;
  }

  async upload(buffer: Buffer, folder: string): Promise<StoredFile> {
    const credentials = this.getCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const format = getImageFileFormat(buffer);
    const formData = this.createSignedFormData(
      { folder, timestamp: String(timestamp) },
      credentials,
    );
    formData.append(
      'file',
      new Blob([buffer], {
        type: format ? `image/${format === 'jpeg' ? 'jpeg' : format}` : '',
      }),
      `upload.${format === 'jpeg' ? 'jpg' : (format ?? 'bin')}`,
    );

    try {
      const payload = await this.post('upload', formData, credentials);
      if (
        typeof payload.secure_url !== 'string' ||
        typeof payload.public_id !== 'string'
      ) {
        throw new Error('Cloudinary did not return an uploaded asset');
      }
      return { url: payload.secure_url, publicId: payload.public_id };
    } catch (error) {
      this.logger.warn(
        `Cloudinary image upload failed (${this.describeUploadError(error)})`,
      );
      if (this.isInvalidImageError(error)) {
        throw new FileStorageInvalidFileError();
      }
      throw error;
    }
  }

  async delete(publicId: string): Promise<void> {
    const credentials = this.getCredentials();
    const timestamp = Math.floor(Date.now() / 1000);
    const formData = this.createSignedFormData(
      {
        invalidate: 'true',
        public_id: publicId,
        timestamp: String(timestamp),
      },
      credentials,
    );

    await this.post('destroy', formData, credentials);
  }

  private getCredentials(): CloudinaryCredentials {
    if (!this.credentials) {
      throw new Error('Cloudinary is not configured');
    }
    return this.credentials;
  }

  private createSignedFormData(
    params: Record<string, string>,
    credentials: CloudinaryCredentials,
  ): FormData {
    const formData = new FormData();
    for (const [key, value] of Object.entries(params)) {
      formData.append(key, value);
    }
    formData.append('api_key', credentials.apiKey);
    formData.append('signature', this.sign(params, credentials.apiSecret));
    return formData;
  }

  private sign(params: Record<string, string>, apiSecret: string): string {
    const payload = Object.entries(params)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    return createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
  }

  private async post(
    action: 'upload' | 'destroy',
    formData: FormData,
    credentials: CloudinaryCredentials,
  ): Promise<CloudinaryApiResponse> {
    const response = await fetch(
      `${CLOUDINARY_API_BASE_URL}/${encodeURIComponent(credentials.cloudName)}/image/${action}`,
      {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(CLOUDINARY_TIMEOUT_MS),
      },
    );
    const payload = (await response.json()) as CloudinaryApiResponse;
    if (!response.ok || payload.error) {
      const error = new Error(
        typeof payload.error?.message === 'string'
          ? payload.error.message
          : `Cloudinary returned HTTP ${response.status}`,
      ) as CloudinaryApiError;
      error.http_code = response.status;
      throw error;
    }
    return payload;
  }

  private describeUploadError(error: unknown): string {
    if (!error || typeof error !== 'object') return 'no response returned';

    const candidate = error as { http_code?: unknown; message?: unknown };
    const status =
      typeof candidate.http_code === 'number'
        ? `HTTP ${candidate.http_code}`
        : 'unknown status';
    const message =
      typeof candidate.message === 'string'
        ? candidate.message
            .replace(
              /(api[_-]?secret|signature|token|key)=?[^\s&]*/gi,
              '$1=[redacted]',
            )
            .slice(0, 240)
        : 'no message';
    return `${status}: ${message}`;
  }

  private isInvalidImageError(error: unknown): boolean {
    if (!error || typeof error !== 'object') return false;
    const candidate = error as { http_code?: unknown; message?: unknown };
    if (candidate.http_code !== 400 || typeof candidate.message !== 'string') {
      return false;
    }
    return /invalid image|unsupported (?:image|format)|corrupt|unable to decode|unknown format|file (?:is )?too large/i.test(
      candidate.message,
    );
  }
}
