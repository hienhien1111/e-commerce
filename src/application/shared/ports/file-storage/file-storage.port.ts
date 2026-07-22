export type StoredFile = {
  url: string;
  publicId: string;
};

/** A storage provider recognized that the supplied bytes are not a usable image. */
export class FileStorageInvalidFileError extends Error {
  constructor() {
    super('The selected image could not be processed by storage');
    this.name = FileStorageInvalidFileError.name;
  }
}

/** External object storage boundary shared by application modules. */
export interface FileStoragePort {
  upload(buffer: Buffer, folder: string): Promise<StoredFile>;
  delete(publicId: string): Promise<void>;
}
