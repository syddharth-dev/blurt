import { randomInt } from 'node:crypto';
import { CLASS_CODE_ALPHABET } from '@blurt/shared/schemas';

/** A 6-character join code like "K7Q2MX" (no 0/O or 1/I/L to mix up). */
export function newClassCode(): string {
  return Array.from(
    { length: 6 },
    () => CLASS_CODE_ALPHABET[randomInt(CLASS_CODE_ALPHABET.length)],
  ).join('');
}
