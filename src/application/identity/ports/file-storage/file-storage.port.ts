export type StoredFile = {
  url: string;
  publicId: string;
};

export interface FileStoragePort {
  upload(buffer: Buffer, folder: string): Promise<StoredFile>;
  delete(publicId: string): Promise<void>;
}
