import { uuidv7 } from 'uuidv7';

/**
 * Generate a UUID v7
 * UUID v7 is time-ordered and sortable
 */
export function generateUuidV7(): string {
  return uuidv7();
}
