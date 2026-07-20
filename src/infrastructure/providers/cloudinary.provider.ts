import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { AllConfigType } from '@/config/config.type';
import type {
  FileStoragePort,
  StoredFile,
} from '@/application/shared/ports/file-storage/file-storage.port';

@Injectable()
export class CloudinaryProvider implements FileStoragePort {
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService<AllConfigType>) {
    const config = this.configService.get('cloudinary', { infer: true });
    this.isConfigured = Boolean(
      config?.cloudName && config.apiKey && config.apiSecret,
    );

    if (this.isConfigured && config) {
      cloudinary.config({
        cloud_name: config.cloudName,
        api_key: config.apiKey,
        api_secret: config.apiSecret,
      });
    }
  }

  async upload(buffer: Buffer, folder: string): Promise<StoredFile> {
    this.assertConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error('Cloudinary did not return an upload'));
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(buffer);
    });
  }

  async delete(publicId: string): Promise<void> {
    this.assertConfigured();
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
  }

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new Error('Cloudinary is not configured');
    }
  }
}
