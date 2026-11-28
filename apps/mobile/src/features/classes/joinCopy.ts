import { CLASS_CODE_ALPHABET } from '@blurt/shared/schemas';

export const CLASS_CODE_LENGTH = 6;

/** Upper-case, drop spaces and dashes, keep only code characters ("k7q-2mx" → "K7Q2MX"). */
export function cleanClassCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CLASS_CODE_LENGTH);
}

/** Codes never use 0, O, 1, I or L, so a code with them was mistyped. */
export function looksMistyped(code: string): boolean {
  return [...code].some((c) => !CLASS_CODE_ALPHABET.includes(c));
}

/** Pip's voice (BRAND.md): short and specific. */
export function joinErrorCopy(e: { code?: string; status?: number } | null): string {
  if (e?.code === 'CLASS_NOT_FOUND')
    return "That code doesn't match a class. Check it with your teacher.";
  if (e?.code === 'OFFLINE') return "You're offline. Joining a class needs a connection.";
  if (e?.status === 429) return 'Too many tries. Wait a minute, then try again.';
  return 'Something went wrong. Try again in a moment.';
}
