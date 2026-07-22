export type ImageFileFormat = 'jpeg' | 'png' | 'webp';

const hasPrefix = (buffer: Buffer, prefix: number[]): boolean =>
  buffer.length >= prefix.length &&
  prefix.every((byte, index) => buffer[index] === byte);

/**
 * MIME types supplied by browsers are only hints. Detect the format from the
 * file bytes so uploads work consistently for `.jpg`, `.jpeg`, and `.png`.
 */
export function getImageFileFormat(buffer: Buffer): ImageFileFormat | null {
  if (hasPrefix(buffer, [0xff, 0xd8, 0xff])) return 'jpeg';
  if (hasPrefix(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'png';
  }
  if (
    hasPrefix(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    buffer.length >= 12 &&
    buffer.subarray(8, 12).equals(Buffer.from('WEBP'))
  ) {
    return 'webp';
  }

  return null;
}
