import { getImageFileFormat } from './image-file-signature';

describe('getImageFileFormat', () => {
  it.each([
    ['JPEG', Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'jpeg'],
    [
      'PNG',
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      'png',
    ],
    [
      'WebP',
      Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]),
      'webp',
    ],
  ] as const)('detects %s bytes', (_name, file, expected) => {
    expect(getImageFileFormat(file)).toBe(expected);
  });

  it('returns null for incomplete or non-image files', () => {
    expect(getImageFileFormat(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(getImageFileFormat(Buffer.from('not an image'))).toBeNull();
  });
});
