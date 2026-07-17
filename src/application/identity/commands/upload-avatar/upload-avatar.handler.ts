import {
  Inject,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { UserRepositoryPort } from '@/application/identity/ports/user/user.repository.port';
import { USER_REPOSITORY_PORT } from '@/application/identity/ports/user/user.repository.port.token';
import type {
  FileStoragePort,
  StoredFile,
} from '@/application/identity/ports/file-storage/file-storage.port';
import { FILE_STORAGE_PORT } from '@/application/identity/ports/file-storage/file-storage.port.token';
import { UploadAvatarCommand } from './upload-avatar.command';
import { UploadAvatarResult } from './upload-avatar.result';

@CommandHandler(UploadAvatarCommand)
export class UploadAvatarHandler
  implements ICommandHandler<UploadAvatarCommand, UploadAvatarResult>
{
  private readonly logger = new Logger(UploadAvatarHandler.name);

  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(command: UploadAvatarCommand): Promise<UploadAvatarResult> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    let uploaded: StoredFile;
    try {
      uploaded = await this.fileStorage.upload(
        command.buffer,
        `avatars/${command.userId}`,
      );
    } catch {
      throw new ServiceUnavailableException('Avatar storage is unavailable');
    }

    let updatedUser: UploadAvatarResult | null;
    try {
      updatedUser = await this.userRepository.update(command.userId, {
        avatarUrl: uploaded.url,
        avatarPublicId: uploaded.publicId,
      });
    } catch (error) {
      await this.deleteBestEffort(
        uploaded.publicId,
        'new avatar after update failure',
      );
      throw error;
    }

    if (!updatedUser) {
      await this.deleteBestEffort(
        uploaded.publicId,
        'new avatar for missing user',
      );
      throw new NotFoundException('User not found');
    }

    if (user.avatarPublicId && user.avatarPublicId !== uploaded.publicId) {
      await this.deleteBestEffort(user.avatarPublicId, 'previous avatar');
    }

    return updatedUser;
  }

  private async deleteBestEffort(
    publicId: string,
    description: string,
  ): Promise<void> {
    try {
      await this.fileStorage.delete(publicId);
    } catch {
      this.logger.warn(`Could not delete ${description}: ${publicId}`);
    }
  }
}
