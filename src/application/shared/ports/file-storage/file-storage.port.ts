export type StoredFile = {
  url: string;
  publicId: string;
};

/** External object storage boundary shared by application modules. */
export interface FileStoragePort {
  upload(buffer: Buffer, folder: string): Promise<StoredFile>;
  delete(publicId: string): Promise<void>;
}
