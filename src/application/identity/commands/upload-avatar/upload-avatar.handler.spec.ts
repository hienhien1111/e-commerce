import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UploadAvatarHandler } from './upload-avatar.handler';
import { UploadAvatarCommand } from './upload-avatar.command';
import { USER_REPOSITORY_PORT } from '@/application/identity/ports/user/user.repository.port.token';
import { FILE_STORAGE_PORT } from '@/application/shared/ports/file-storage/file-storage.port.token';
import { FileStorageInvalidFileError } from '@/application/shared/ports/file-storage/file-storage.port';
import { User } from '@/domain/entities/user';

describe('UploadAvatarHandler', () => {
  let handler: UploadAvatarHandler;
  let userRepository: {
    findById: jest.Mock;
    update: jest.Mock;
  };
  let fileStorage: {
    upload: jest.Mock;
    delete: jest.Mock;
  };

  const command = new UploadAvatarCommand('user-123', Buffer.from('image'));
  const uploaded = {
    url: 'https://res.cloudinary.com/demo/image/upload/new-avatar.png',
    publicId: 'avatars/user-123/new-avatar',
  };

  beforeEach(async () => {
    userRepository = {
      findById: jest.fn(),
      update: jest.fn(),
    };
    fileStorage = {
      upload: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadAvatarHandler,
        { provide: USER_REPOSITORY_PORT, useValue: userRepository },
        { provide: FILE_STORAGE_PORT, useValue: fileStorage },
      ],
    }).compile();

    handler = module.get(UploadAvatarHandler);
  });

  it('uploads, persists, and removes the previous avatar', async () => {
    const existingUser = {
      id: command.userId,
      avatarPublicId: 'avatars/user-123/old-avatar',
    } as User;
    const updatedUser = {
      id: command.userId,
      avatarUrl: uploaded.url,
      avatarPublicId: uploaded.publicId,
    } as User;
    userRepository.findById.mockResolvedValue(existingUser);
    fileStorage.upload.mockResolvedValue(uploaded);
    userRepository.update.mockResolvedValue(updatedUser);

    await expect(handler.execute(command)).resolves.toBe(updatedUser);

    expect(fileStorage.upload).toHaveBeenCalledWith(
      command.buffer,
      'avatars/user-123',
    );
    expect(userRepository.update).toHaveBeenCalledWith(command.userId, {
      avatarUrl: uploaded.url,
      avatarPublicId: uploaded.publicId,
    });
    expect(fileStorage.delete).toHaveBeenCalledWith(
      'avatars/user-123/old-avatar',
    );
  });

  it('fails when the user does not exist before uploading', async () => {
    userRepository.findById.mockResolvedValue(null);

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    expect(fileStorage.upload).not.toHaveBeenCalled();
  });

  it('maps storage upload errors to service unavailable', async () => {
    userRepository.findById.mockResolvedValue({ id: command.userId } as User);
    fileStorage.upload.mockRejectedValue(new Error('Cloudinary unavailable'));

    await expect(handler.execute(command)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('reports an invalid image instead of a storage outage', async () => {
    userRepository.findById.mockResolvedValue({ id: command.userId } as User);
    fileStorage.upload.mockRejectedValue(new FileStorageInvalidFileError());

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
  });

  it('deletes the newly uploaded avatar when persistence fails', async () => {
    userRepository.findById.mockResolvedValue({ id: command.userId } as User);
    fileStorage.upload.mockResolvedValue(uploaded);
    userRepository.update.mockRejectedValue(new Error('Database unavailable'));

    await expect(handler.execute(command)).rejects.toThrow(
      'Database unavailable',
    );
    expect(fileStorage.delete).toHaveBeenCalledWith(uploaded.publicId);
  });

  it('keeps a successful upload when deleting the old avatar fails', async () => {
    userRepository.findById.mockResolvedValue({
      id: command.userId,
      avatarPublicId: 'avatars/user-123/old-avatar',
    } as User);
    fileStorage.upload.mockResolvedValue(uploaded);
    userRepository.update.mockResolvedValue({ id: command.userId } as User);
    fileStorage.delete.mockRejectedValue(new Error('Delete failed'));

    await expect(handler.execute(command)).resolves.toMatchObject({
      id: command.userId,
    });
  });
});
