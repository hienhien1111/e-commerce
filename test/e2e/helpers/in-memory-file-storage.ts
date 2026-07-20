import { randomUUID } from 'node:crypto';
import type {
  FileStoragePort,
  StoredFile,
} from '@/application/shared/ports/file-storage/file-storage.port';

export class InMemoryFileStorage implements FileStoragePort {
  readonly uploads: Array<{
    buffer: Buffer;
    folder: string;
    file: StoredFile;
  }> = [];
  readonly deletedPublicIds: string[] = [];

  async upload(buffer: Buffer, folder: string): Promise<StoredFile> {
    const publicId = `${folder}/${randomUUID()}`;
    const file = {
      url: `https://storage.test/${publicId}.png`,
      publicId,
    };
    this.uploads.push({ buffer, folder, file });
    return file;
  }

  async delete(publicId: string): Promise<void> {
    this.deletedPublicIds.push(publicId);
  }
}
